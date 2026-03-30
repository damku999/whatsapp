'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pino = require('pino');
const sessionManager = require('./src/sessionManager');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: [
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Internal-Secret']
}));

// Auth middleware
const authMiddleware = require('./src/middleware/auth');
app.use(authMiddleware);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const healthRoutes = require('./src/routes/health');
const sessionRoutes = require('./src/routes/session');
const messageRoutes = require('./src/routes/message');
const contactsRoutes = require('./src/routes/contacts');
const groupsRoutes = require('./src/routes/groups');
const statusRoutes = require('./src/routes/status');

app.use('/health', healthRoutes);
app.use('/session', sessionRoutes);
app.use('/sessions', sessionRoutes);
app.use('/message', messageRoutes);
app.use('/contacts', contactsRoutes);
app.use('/groups', groupsRoutes);
app.use('/status', statusRoutes);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  logger.info(`WhatsApp Monks Engine v1.0.0 started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Laravel webhook: ${process.env.LARAVEL_WEBHOOK_URL}`);
  logger.info(`Session data path: ${process.env.SESSION_DATA_PATH || './sessions'}`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Disconnect all WhatsApp sessions
  try {
    const sessions = sessionManager.getAllSessions();
    logger.info(`Disconnecting ${sessions.length} active session(s)...`);

    const disconnectPromises = sessions.map(async (s) => {
      try {
        await sessionManager.disconnectSession(s.session_id);
        logger.info(`Session ${s.session_id} disconnected`);
      } catch (err) {
        logger.error({ err, session_id: s.session_id }, 'Error disconnecting session');
      }
    });

    await Promise.allSettled(disconnectPromises);
  } catch (err) {
    logger.error({ err }, 'Error during session cleanup');
  }

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
});

module.exports = app;
