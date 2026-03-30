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
 * GET /contacts/:session_id/check?phone=<number>
 * Check if a phone number is registered on WhatsApp.
 */
router.get('/:session_id/check', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'phone query parameter is required' });
    }

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const client = session.client;

    // Clean phone number
    const cleaned = String(phone).replace(/[^0-9]/g, '');
    const numberId = await client.getNumberId(cleaned);

    if (numberId) {
      // Number is on WhatsApp - try to get contact info
      let contactName = null;
      try {
        const contact = await client.getContactById(numberId._serialized);
        contactName = contact.pushname || contact.name || contact.shortName || null;
      } catch (_) { /* contact info may not be available */ }

      res.json({
        on_whatsapp: true,
        phone: cleaned,
        whatsapp_id: numberId._serialized,
        name: contactName
      });
    } else {
      res.json({
        on_whatsapp: false,
        phone: cleaned,
        whatsapp_id: null,
        name: null
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error checking contact');
    res.status(500).json({ error: 'Failed to check contact', details: err.message });
  }
});

/**
 * GET /contacts/:session_id/list
 * List all contacts for a session.
 */
router.get('/:session_id/list', async (req, res) => {
  try {
    const { session_id } = req.params;

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const client = session.client;
    const contacts = await client.getContacts();

    const mapped = contacts
      .filter((c) => c.isUser && !c.isMe)
      .map((c) => ({
        id: c.id._serialized,
        number: c.number,
        name: c.name || null,
        pushname: c.pushname || null,
        short_name: c.shortName || null,
        is_business: c.isBusiness || false,
        is_blocked: c.isBlocked || false
      }));

    res.json({
      session_id,
      contacts: mapped,
      count: mapped.length
    });
  } catch (err) {
    logger.error({ err }, 'Error listing contacts');
    res.status(500).json({ error: 'Failed to list contacts', details: err.message });
  }
});

/**
 * GET /contacts/:session_id/profile?phone=<number>
 * Get profile info for a phone number (name, about, profile picture).
 */
router.get('/:session_id/profile', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'phone query parameter is required' });
    }

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const client = session.client;
    const cleaned = String(phone).replace(/[^0-9]/g, '');
    const contactId = `${cleaned}@c.us`;

    const contact = await client.getContactById(contactId);

    let profilePicUrl = null;
    try {
      profilePicUrl = await client.getProfilePicUrl(contactId);
    } catch (_) { /* profile pic may be private */ }

    let about = null;
    try {
      about = await contact.getAbout();
    } catch (_) { /* about may be private */ }

    res.json({
      session_id,
      phone: cleaned,
      whatsapp_id: contactId,
      name: contact.name || null,
      pushname: contact.pushname || null,
      short_name: contact.shortName || null,
      about,
      profile_picture: profilePicUrl,
      is_business: contact.isBusiness || false,
      is_blocked: contact.isBlocked || false
    });
  } catch (err) {
    logger.error({ err }, 'Error getting contact profile');
    res.status(500).json({ error: 'Failed to get contact profile', details: err.message });
  }
});

module.exports = router;
