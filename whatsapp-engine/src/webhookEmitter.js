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
 * Posts an event payload to the Laravel backend webhook endpoint.
 *
 * @param {string} event   - Event name (e.g. 'session.ready', 'message.received')
 * @param {object} data    - Payload to send
 * @returns {Promise<void>}
 */
async function postToLaravel(event, data) {
  const webhookUrl = process.env.LARAVEL_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('LARAVEL_WEBHOOK_URL is not configured, skipping webhook');
    return;
  }

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_SECRET || ''
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '(no body)');
      logger.error(
        { status: response.status, body, event },
        'Laravel webhook returned non-OK status'
      );
      return;
    }

    logger.debug({ event }, 'Webhook delivered to Laravel');
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.error({ event }, 'Laravel webhook timed out');
    } else {
      logger.error({ err: err.message, event }, 'Failed to deliver webhook to Laravel');
    }
  }
}

module.exports = { postToLaravel };
