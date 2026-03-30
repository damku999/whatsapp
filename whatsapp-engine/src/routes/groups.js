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
 * GET /groups/:session_id/list
 * List all groups for a session.
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
    const chats = await client.getChats();
    const groups = chats
      .filter((chat) => chat.isGroup)
      .map((group) => ({
        id: group.id._serialized,
        name: group.name,
        participant_count: group.participants ? group.participants.length : 0,
        is_read_only: group.isReadOnly || false,
        timestamp: group.timestamp || null
      }));

    res.json({
      session_id,
      groups,
      count: groups.length
    });
  } catch (err) {
    logger.error({ err }, 'Error listing groups');
    res.status(500).json({ error: 'Failed to list groups', details: err.message });
  }
});

/**
 * GET /groups/:session_id/:group_id/members
 * Get members of a specific group.
 */
router.get('/:session_id/:group_id/members', async (req, res) => {
  try {
    const { session_id, group_id } = req.params;

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const client = session.client;

    // Ensure group_id ends with @g.us
    let groupJid = group_id;
    if (!groupJid.endsWith('@g.us')) {
      groupJid += '@g.us';
    }

    const chat = await client.getChatById(groupJid);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found or chat is not a group' });
    }

    const groupMetadata = chat.groupMetadata || {};
    const participants = groupMetadata.participants || [];

    const members = participants.map((p) => ({
      id: p.id._serialized,
      number: p.id.user,
      is_admin: p.isAdmin || false,
      is_super_admin: p.isSuperAdmin || false
    }));

    // Try to enrich with contact names
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        try {
          const contact = await client.getContactById(member.id);
          member.name = contact.pushname || contact.name || null;
        } catch (_) {
          member.name = null;
        }
        return member;
      })
    );

    res.json({
      session_id,
      group_id: groupJid,
      group_name: chat.name,
      members: enrichedMembers,
      count: enrichedMembers.length
    });
  } catch (err) {
    logger.error({ err }, 'Error getting group members');
    res.status(500).json({ error: 'Failed to get group members', details: err.message });
  }
});

/**
 * POST /groups/:session_id/create
 * Body: { name: string, participants: string[] }
 * Create a new group.
 */
router.post('/:session_id/create', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { name, participants } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'participants must be a non-empty array of phone numbers' });
    }

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const client = session.client;

    // Normalize participant numbers to @c.us format
    const participantIds = participants.map((p) => {
      const cleaned = String(p).replace(/[^0-9]/g, '');
      return `${cleaned}@c.us`;
    });

    const result = await client.createGroup(name, participantIds);

    logger.info({ session_id, groupName: name, participantCount: participants.length }, 'Group created');

    res.json({
      session_id,
      group_id: result.gid ? result.gid._serialized : null,
      name,
      participants_added: result.participants || [],
      message: 'Group created successfully'
    });
  } catch (err) {
    logger.error({ err }, 'Error creating group');
    res.status(500).json({ error: 'Failed to create group', details: err.message });
  }
});

module.exports = router;
