'use strict';

const { Router } = require('express');
const sessionManager = require('../sessionManager');
const pkg = require('../../package.json');

const router = Router();

/**
 * GET /health
 * Returns engine health status. No auth required.
 */
router.get('/', (_req, res) => {
  const sessions = sessionManager.getAllSessions();
  const activeSessions = sessions.filter((s) => s.status === 'ready').length;

  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    activeSessions,
    totalSessions: sessions.length,
    engineVersion: pkg.version,
    nodeVersion: process.version,
    memoryUsage: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
    }
  });
});

module.exports = router;
