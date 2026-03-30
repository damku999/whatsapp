'use strict';

const { Router } = require('express');
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
 * POST /session/start
 * Body: { session_id: string, auth_type: 'qr' | 'pairing', phone?: string }
 * Start a new WhatsApp session. Returns QR code or pairing code depending on auth_type.
 */
router.post('/start', async (req, res) => {
  try {
    const { session_id, auth_type = 'qr', phone } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    if (!['qr', 'pairing'].includes(auth_type)) {
      return res.status(400).json({ error: 'auth_type must be "qr" or "pairing"' });
    }

    if (auth_type === 'pairing' && !phone) {
      return res.status(400).json({ error: 'phone is required for pairing auth_type' });
    }

    logger.info({ session_id, auth_type }, 'Starting session');

    const result = await sessionManager.startSession(session_id, auth_type);
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Error starting session');
    res.status(500).json({ error: 'Failed to start session', details: err.message });
  }
});

/**
 * GET /session/:id/status
 * Returns session status, phone, profile info.
 */
router.get('/:id/status', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const status = await sessionManager.getSessionStatus(sessionId);

    if (!status) {
      return res.status(404).json({ error: `Session ${sessionId} not found` });
    }

    res.json(status);
  } catch (err) {
    logger.error({ err }, 'Error getting session status');
    res.status(500).json({ error: 'Failed to get session status', details: err.message });
  }
});

/**
 * POST /session/:id/disconnect
 * Disconnect a session.
 */
router.post('/:id/disconnect', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const result = await sessionManager.disconnectSession(sessionId);
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Error disconnecting session');
    const statusCode = err.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

/**
 * GET /sessions (also mounted at /session/list via the /sessions mount)
 * List all sessions.
 */
router.get('/', (_req, res) => {
  try {
    const sessions = sessionManager.getAllSessions();
    res.json({ sessions, count: sessions.length });
  } catch (err) {
    logger.error({ err }, 'Error listing sessions');
    res.status(500).json({ error: 'Failed to list sessions', details: err.message });
  }
});

module.exports = router;
