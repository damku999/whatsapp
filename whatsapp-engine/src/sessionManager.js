'use strict';

const { Client, LocalAuth, MessageMedia, Location, Buttons } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const pino = require('pino');
const { postToLaravel } = require('./webhookEmitter');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
  }
});

// ---------------------------------------------------------------------------
// Session store: session_id => { client, status, phone, info, qr, pairingCode, reconnectAttempts }
// ---------------------------------------------------------------------------
const sessions = new Map();

const SESSION_DATA_PATH = path.resolve(process.env.SESSION_DATA_PATH || './sessions');
const MAX_RECONNECT_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Puppeteer launch args (minimal memory footprint)
// ---------------------------------------------------------------------------
const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--single-process',
  '--disable-extensions'
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start (or reconnect) a WhatsApp session.
 *
 * @param {string} sessionId  - Unique identifier for this session
 * @param {string} authType   - 'qr' | 'pairing'
 * @returns {Promise<{ session_id, status, qr?, pairing_code? }>}
 */
async function startSession(sessionId, authType = 'qr') {
  // If session already exists and is connected, return its status
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    if (existing.status === 'ready' || existing.status === 'authenticated') {
      logger.info({ sessionId }, 'Session already active');
      return {
        session_id: sessionId,
        status: existing.status,
        phone: existing.phone || null,
        message: 'Session already active'
      };
    }
    // If it exists but is initializing, return current state
    if (existing.status === 'initializing' || existing.status === 'qr_pending') {
      return {
        session_id: sessionId,
        status: existing.status,
        qr: existing.qr || null,
        pairing_code: existing.pairingCode || null,
        message: 'Session is initializing'
      };
    }
    // Otherwise tear it down and re-create
    try {
      await disconnectSession(sessionId);
    } catch (_) { /* ignore cleanup errors */ }
  }

  logger.info({ sessionId, authType }, 'Starting new session');

  // Store placeholder immediately
  const sessionData = {
    client: null,
    status: 'initializing',
    phone: null,
    info: null,
    qr: null,
    pairingCode: null,
    reconnectAttempts: 0,
    authType
  };
  sessions.set(sessionId, sessionData);

  // Build client
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionId,
      dataPath: SESSION_DATA_PATH
    }),
    puppeteer: {
      headless: true,
      args: PUPPETEER_ARGS
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/nicampe/nicampe/main/AltWWJS/ww_cache/',
    }
  });

  sessionData.client = client;

  // ----- QR code event -------------------------------------------------------
  return new Promise((resolve) => {
    let resolved = false;

    client.on('qr', async (qr) => {
      logger.info({ sessionId }, 'QR code received');
      sessionData.status = 'qr_pending';

      if (authType === 'pairing') {
        // For pairing code auth, request code after QR is emitted
        try {
          const pairingCode = await client.requestPairingCode(sessionData.phone || sessionId);
          sessionData.pairingCode = pairingCode;
          sessionData.status = 'pairing_pending';
          logger.info({ sessionId, pairingCode }, 'Pairing code generated');

          await postToLaravel('session.pairing_code', {
            session_id: sessionId,
            pairing_code: pairingCode
          });

          if (!resolved) {
            resolved = true;
            resolve({
              session_id: sessionId,
              status: 'pairing_pending',
              pairing_code: pairingCode
            });
          }
        } catch (err) {
          logger.error({ err, sessionId }, 'Failed to generate pairing code');
        }
        return;
      }

      // QR auth
      try {
        const qrBase64 = await qrcode.toDataURL(qr);
        sessionData.qr = qrBase64;

        await postToLaravel('session.qr', {
          session_id: sessionId,
          qr: qrBase64
        });

        if (!resolved) {
          resolved = true;
          resolve({
            session_id: sessionId,
            status: 'qr_pending',
            qr: qrBase64
          });
        }
      } catch (err) {
        logger.error({ err, sessionId }, 'Failed to generate QR base64');
      }
    });

    // ----- Authenticated event -------------------------------------------------
    client.on('authenticated', () => {
      logger.info({ sessionId }, 'Session authenticated');
      sessionData.status = 'authenticated';
      sessionData.qr = null;
      sessionData.pairingCode = null;

      postToLaravel('session.authenticated', { session_id: sessionId });
    });

    // ----- Ready event ---------------------------------------------------------
    client.on('ready', async () => {
      logger.info({ sessionId }, 'Session ready');
      sessionData.status = 'ready';
      sessionData.reconnectAttempts = 0;

      try {
        const info = client.info;
        sessionData.phone = info.wid.user;
        sessionData.info = {
          phone: info.wid.user,
          platform: info.platform,
          pushname: info.pushname
        };

        // Try to get profile picture
        try {
          const profilePicUrl = await client.getProfilePicUrl(info.wid._serialized);
          sessionData.info.profilePicture = profilePicUrl || null;
        } catch (_) {
          sessionData.info.profilePicture = null;
        }
      } catch (err) {
        logger.error({ err, sessionId }, 'Failed to read client info');
      }

      await postToLaravel('session.ready', {
        session_id: sessionId,
        phone: sessionData.phone,
        info: sessionData.info
      });

      // Resolve promise if QR was never emitted (restored session)
      if (!resolved) {
        resolved = true;
        resolve({
          session_id: sessionId,
          status: 'ready',
          phone: sessionData.phone
        });
      }
    });

    // ----- Auth failure --------------------------------------------------------
    client.on('auth_failure', async (msg) => {
      logger.error({ sessionId, msg }, 'Authentication failure');
      sessionData.status = 'auth_failure';

      await postToLaravel('session.auth_failure', {
        session_id: sessionId,
        message: msg
      });

      if (!resolved) {
        resolved = true;
        resolve({
          session_id: sessionId,
          status: 'auth_failure',
          error: msg
        });
      }
    });

    // ----- Disconnected event --------------------------------------------------
    client.on('disconnected', async (reason) => {
      logger.warn({ sessionId, reason }, 'Session disconnected');
      sessionData.status = 'disconnected';

      await postToLaravel('session.disconnected', {
        session_id: sessionId,
        reason
      });

      // Attempt reconnection
      if (sessionData.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        sessionData.reconnectAttempts += 1;
        const delay = sessionData.reconnectAttempts * 5000; // 5s, 10s, 15s
        logger.info(
          { sessionId, attempt: sessionData.reconnectAttempts, delay },
          'Scheduling reconnection attempt'
        );

        setTimeout(async () => {
          try {
            logger.info({ sessionId, attempt: sessionData.reconnectAttempts }, 'Attempting reconnect');
            sessionData.status = 'reconnecting';
            await client.initialize();
          } catch (err) {
            logger.error({ err, sessionId }, 'Reconnection failed');
            sessionData.status = 'disconnected';
          }
        }, delay);
      } else {
        logger.error({ sessionId }, 'Max reconnection attempts reached');
        sessionData.status = 'failed';
        await postToLaravel('session.failed', {
          session_id: sessionId,
          reason: 'Max reconnection attempts reached'
        });
      }
    });

    // ----- Incoming message ----------------------------------------------------
    client.on('message', async (msg) => {
      try {
        const contact = await msg.getContact();
        const chat = await msg.getChat();

        const payload = {
          session_id: sessionId,
          message_id: msg.id._serialized,
          from: msg.from,
          to: msg.to,
          body: msg.body,
          type: msg.type,
          timestamp: msg.timestamp,
          is_group: chat.isGroup,
          group_name: chat.isGroup ? chat.name : null,
          contact_name: contact.pushname || contact.name || null,
          has_media: msg.hasMedia,
          is_forwarded: msg.isForwarded,
          has_quoted_msg: msg.hasQuotedMsg
        };

        // Download media if present
        if (msg.hasMedia) {
          try {
            const media = await msg.downloadMedia();
            if (media) {
              payload.media = {
                mimetype: media.mimetype,
                data: media.data,
                filename: media.filename || null
              };
            }
          } catch (err) {
            logger.error({ err, sessionId }, 'Failed to download incoming media');
          }
        }

        // Get quoted message if present
        if (msg.hasQuotedMsg) {
          try {
            const quoted = await msg.getQuotedMessage();
            payload.quoted_msg = {
              message_id: quoted.id._serialized,
              body: quoted.body,
              type: quoted.type
            };
          } catch (err) {
            logger.error({ err, sessionId }, 'Failed to get quoted message');
          }
        }

        await postToLaravel('message.received', payload);
      } catch (err) {
        logger.error({ err, sessionId }, 'Error processing incoming message');
      }
    });

    // ----- Message ACK (delivery/read status) ----------------------------------
    client.on('message_ack', async (msg, ack) => {
      /*
       * ACK values:
       * -1 = ERROR, 0 = PENDING, 1 = SERVER, 2 = DEVICE, 3 = READ, 4 = PLAYED
       */
      try {
        const ackLabels = {
          '-1': 'error',
          '0': 'pending',
          '1': 'server',
          '2': 'delivered',
          '3': 'read',
          '4': 'played'
        };

        await postToLaravel('message.ack', {
          session_id: sessionId,
          message_id: msg.id._serialized,
          ack,
          ack_label: ackLabels[String(ack)] || 'unknown',
          to: msg.to,
          from: msg.from
        });
      } catch (err) {
        logger.error({ err, sessionId }, 'Error processing message ack');
      }
    });

    // ----- Message create (outgoing messages) ----------------------------------
    client.on('message_create', async (msg) => {
      // Only process messages we sent
      if (!msg.fromMe) return;

      try {
        await postToLaravel('message.sent', {
          session_id: sessionId,
          message_id: msg.id._serialized,
          to: msg.to,
          body: msg.body,
          type: msg.type,
          timestamp: msg.timestamp
        });
      } catch (err) {
        logger.error({ err, sessionId }, 'Error processing outgoing message event');
      }
    });

    // ----- Group events --------------------------------------------------------
    client.on('group_join', async (notification) => {
      try {
        await postToLaravel('group.join', {
          session_id: sessionId,
          group_id: notification.chatId,
          participant: notification.id.participant,
          type: notification.type
        });
      } catch (err) {
        logger.error({ err, sessionId }, 'Error processing group join');
      }
    });

    client.on('group_leave', async (notification) => {
      try {
        await postToLaravel('group.leave', {
          session_id: sessionId,
          group_id: notification.chatId,
          participant: notification.id.participant,
          type: notification.type
        });
      } catch (err) {
        logger.error({ err, sessionId }, 'Error processing group leave');
      }
    });

    // ----- Initialize client ---------------------------------------------------
    client.initialize().catch((err) => {
      logger.error({ err, sessionId }, 'Client initialization failed');
      sessionData.status = 'failed';

      if (!resolved) {
        resolved = true;
        resolve({
          session_id: sessionId,
          status: 'failed',
          error: err.message
        });
      }
    });

    // Safety timeout -- if nothing resolves in 60 seconds, respond anyway
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          session_id: sessionId,
          status: sessionData.status,
          message: 'Session initialization in progress. Check status endpoint for updates.'
        });
      }
    }, 60000);
  });
}

/**
 * Retrieve the session object by ID.
 */
function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Retrieve the status summary for a session.
 */
async function getSessionStatus(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const result = {
    session_id: sessionId,
    status: session.status,
    phone: session.phone || null,
    profileName: null,
    profilePicture: null
  };

  if (session.info) {
    result.profileName = session.info.pushname || null;
    result.profilePicture = session.info.profilePicture || null;
  }

  // Refresh profile picture if session is ready
  if (session.status === 'ready' && session.client && session.client.info) {
    try {
      const picUrl = await session.client.getProfilePicUrl(session.client.info.wid._serialized);
      result.profilePicture = picUrl || null;
    } catch (_) { /* profile pic may be private */ }
  }

  return result;
}

/**
 * Disconnect and remove a session.
 */
async function disconnectSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  try {
    if (session.client) {
      await session.client.destroy();
    }
  } catch (err) {
    logger.error({ err, sessionId }, 'Error destroying client');
  }

  sessions.delete(sessionId);
  logger.info({ sessionId }, 'Session disconnected and removed');

  await postToLaravel('session.disconnected', {
    session_id: sessionId,
    reason: 'manual_disconnect'
  });

  return { session_id: sessionId, status: 'disconnected' };
}

/**
 * Return array of all sessions with status info.
 */
function getAllSessions() {
  const result = [];
  for (const [sessionId, session] of sessions) {
    result.push({
      session_id: sessionId,
      status: session.status,
      phone: session.phone || null,
      profileName: session.info ? session.info.pushname : null
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Export singleton
// ---------------------------------------------------------------------------
module.exports = {
  startSession,
  getSession,
  getSessionStatus,
  disconnectSession,
  getAllSessions,
  sessions // expose map for advanced usage in routes
};
