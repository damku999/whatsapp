'use strict';

const { Router } = require('express');
const { MessageMedia, Location } = require('whatsapp-web.js');
const pino = require('pino');
const sessionManager = require('../sessionManager');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
  }
});

const router = Router();

/**
 * Normalise a phone number to the WhatsApp JID format: <number>@c.us
 */
function normalizeNumber(phone) {
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (!cleaned.endsWith('@c.us')) {
    cleaned += '@c.us';
  }
  return cleaned;
}

/**
 * Generate a simple campaign ID (no uuid dependency required).
 */
function generateCampaignId() {
  return `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * POST /message/send
 * Body: {
 *   session_id, to, type,
 *   content,         // text body or caption
 *   media_url,       // URL for image/video/doc/audio/sticker
 *   quoted_msg_id,   // optional: reply to a specific message
 *   latitude,        // for location type
 *   longitude,       // for location type
 *   vcard            // for contact type
 * }
 */
router.post('/send', async (req, res) => {
  try {
    const {
      session_id,
      to,
      type = 'text',
      content,
      media_url,
      quoted_msg_id,
      latitude,
      longitude,
      vcard,
      filename
    } = req.body;

    // Validation
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });
    if (!to) return res.status(400).json({ error: '"to" (recipient number) is required' });

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const client = session.client;
    const chatId = normalizeNumber(to);

    // Build send options
    const sendOptions = {};
    if (quoted_msg_id) {
      try {
        // Find the quoted message to pass as context
        const quotedMsg = await client.getMessageById(quoted_msg_id);
        if (quotedMsg) sendOptions.quotedMessageId = quoted_msg_id;
      } catch (_) {
        logger.warn({ quoted_msg_id }, 'Quoted message not found, sending without quote');
      }
    }

    let sentMsg;

    switch (type) {
      case 'text': {
        if (!content) return res.status(400).json({ error: 'content is required for text messages' });
        sentMsg = await client.sendMessage(chatId, content, sendOptions);
        break;
      }

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
      case 'sticker': {
        if (!media_url) return res.status(400).json({ error: `media_url is required for ${type} messages` });

        let media;
        if (media_url.startsWith('data:')) {
          // Base64 encoded media
          const matches = media_url.match(/^data:(.+);base64,(.+)$/);
          if (!matches) return res.status(400).json({ error: 'Invalid base64 media_url format' });
          media = new MessageMedia(matches[1], matches[2], filename || null);
        } else {
          // URL-based media
          media = await MessageMedia.fromUrl(media_url, { unsafeMime: true });
        }

        if (filename) media.filename = filename;

        const mediaOptions = { ...sendOptions };
        if (content) mediaOptions.caption = content;
        if (type === 'sticker') mediaOptions.sendMediaAsSticker = true;
        if (type === 'document') mediaOptions.sendMediaAsDocument = true;

        sentMsg = await client.sendMessage(chatId, media, mediaOptions);
        break;
      }

      case 'location': {
        if (latitude === undefined || longitude === undefined) {
          return res.status(400).json({ error: 'latitude and longitude are required for location messages' });
        }
        const location = new Location(parseFloat(latitude), parseFloat(longitude), content || '');
        sentMsg = await client.sendMessage(chatId, location, sendOptions);
        break;
      }

      case 'contact': {
        if (!vcard) return res.status(400).json({ error: 'vcard is required for contact messages' });
        sentMsg = await client.sendMessage(chatId, vcard, sendOptions);
        break;
      }

      default:
        return res.status(400).json({ error: `Unsupported message type: ${type}` });
    }

    logger.info({ session_id, to: chatId, type, messageId: sentMsg.id._serialized }, 'Message sent');

    res.json({
      message_id: sentMsg.id._serialized,
      status: 'sent',
      to: chatId,
      type,
      timestamp: sentMsg.timestamp
    });
  } catch (err) {
    logger.error({ err }, 'Error sending message');
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

/**
 * POST /message/send-bulk
 * Body: {
 *   session_id,
 *   recipients: string[],    // array of phone numbers
 *   content: string,
 *   type: string,
 *   media_url?: string,
 *   delay_min?: number,      // min delay in ms between sends (default 1000)
 *   delay_max?: number       // max delay in ms between sends (default 3000)
 * }
 */
router.post('/send-bulk', async (req, res) => {
  try {
    const {
      session_id,
      recipients,
      content,
      type = 'text',
      media_url,
      delay_min = 1000,
      delay_max = 3000,
      filename
    } = req.body;

    // Validation
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients must be a non-empty array' });
    }
    if (!content && type === 'text') {
      return res.status(400).json({ error: 'content is required for text messages' });
    }

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const campaignId = generateCampaignId();
    const client = session.client;

    logger.info(
      { session_id, campaignId, recipientCount: recipients.length, type },
      'Starting bulk send'
    );

    // Respond immediately, process in background
    res.json({
      campaign_id: campaignId,
      queued: recipients.length,
      status: 'processing',
      message: 'Bulk send started. Messages will be delivered with random delays.'
    });

    // Process in background
    (async () => {
      let sent = 0;
      let failed = 0;

      // Prepare media once if needed
      let media = null;
      if (media_url && type !== 'text') {
        try {
          if (media_url.startsWith('data:')) {
            const matches = media_url.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
              media = new MessageMedia(matches[1], matches[2], filename || null);
            }
          } else {
            media = await MessageMedia.fromUrl(media_url, { unsafeMime: true });
          }
          if (filename && media) media.filename = filename;
        } catch (err) {
          logger.error({ err, campaignId }, 'Failed to prepare bulk media');
        }
      }

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const chatId = normalizeNumber(recipient);

        try {
          const sendOptions = {};
          if (content && media) sendOptions.caption = content;

          if (type === 'text') {
            await client.sendMessage(chatId, content, sendOptions);
          } else if (media) {
            const mediaOpts = { ...sendOptions };
            if (type === 'sticker') mediaOpts.sendMediaAsSticker = true;
            if (type === 'document') mediaOpts.sendMediaAsDocument = true;
            await client.sendMessage(chatId, media, mediaOpts);
          }

          sent++;
          logger.debug({ campaignId, recipient: chatId, progress: `${i + 1}/${recipients.length}` }, 'Bulk message sent');
        } catch (err) {
          failed++;
          logger.error({ err: err.message, campaignId, recipient: chatId }, 'Bulk message failed');
        }

        // Random delay between messages (except after the last one)
        if (i < recipients.length - 1) {
          const delay = Math.floor(Math.random() * (delay_max - delay_min + 1)) + delay_min;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      logger.info({ campaignId, sent, failed, total: recipients.length }, 'Bulk send completed');

      // Notify Laravel about completion
      const { postToLaravel } = require('../webhookEmitter');
      await postToLaravel('bulk.completed', {
        campaign_id: campaignId,
        session_id,
        sent,
        failed,
        total: recipients.length
      });
    })();
  } catch (err) {
    logger.error({ err }, 'Error starting bulk send');
    res.status(500).json({ error: 'Failed to start bulk send', details: err.message });
  }
});

module.exports = router;
