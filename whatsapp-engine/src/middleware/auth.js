'use strict';

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
  }
});

/**
 * Authentication middleware.
 * Validates the X-Internal-Secret header against the configured INTERNAL_SECRET.
 * The /health endpoint is exempt from authentication.
 */
function authMiddleware(req, res, next) {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  const secret = req.headers['x-internal-secret'];
  const expectedSecret = process.env.INTERNAL_SECRET;

  if (!expectedSecret) {
    logger.error('INTERNAL_SECRET is not configured in environment');
    return res.status(500).json({ error: 'Server misconfiguration: secret not set' });
  }

  if (!secret) {
    logger.warn({ ip: req.ip, path: req.path }, 'Request missing X-Internal-Secret header');
    return res.status(401).json({ error: 'Authentication required. Provide X-Internal-Secret header.' });
  }

  if (secret !== expectedSecret) {
    logger.warn({ ip: req.ip, path: req.path }, 'Invalid X-Internal-Secret header');
    return res.status(401).json({ error: 'Invalid secret' });
  }

  next();
}

module.exports = authMiddleware;
