'use strict';

const { Router } = require('express');
const { MessageMedia } = require('whatsapp-web.js');
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
 * POST /status/:session_id/post
 * Body: {
 *   type: 'text' | 'image' | 'video',
 *   content: string,          // text body or caption for media
 *   media_url?: string,       // URL or base64 for image/video
 *   background_color?: string, // hex colour for text status background
 *   font?: number              // font style for text status (0-4)
 * }
 * Post a WhatsApp status (story).
 */
router.post('/:session_id/post', async (req, res) => {
  try {
    const { session_id } = req.params;
    const {
      type = 'text',
      content,
      media_url,
      background_color,
      font,
      filename
    } = req.body;

    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    const session = sessionManager.getSession(session_id);
    if (!session) return res.status(404).json({ error: `Session ${session_id} not found` });
    if (session.status !== 'ready') {
      return res.status(409).json({ error: `Session is not ready (current: ${session.status})` });
    }

    const client = session.client;
    const statusChatId = 'status@broadcast';

    switch (type) {
      case 'text': {
        if (!content) return res.status(400).json({ error: 'content is required for text status' });

        const textOptions = {};
        if (background_color) textOptions.backgroundColor = background_color;
        if (font !== undefined) textOptions.font = font;

        await client.sendMessage(statusChatId, content, textOptions);

        logger.info({ session_id, type }, 'Text status posted');
        res.json({
          session_id,
          status: 'posted',
          type: 'text'
        });
        break;
      }

      case 'image':
      case 'video': {
        if (!media_url) return res.status(400).json({ error: `media_url is required for ${type} status` });

        let media;
        if (media_url.startsWith('data:')) {
          const matches = media_url.match(/^data:(.+);base64,(.+)$/);
          if (!matches) return res.status(400).json({ error: 'Invalid base64 media_url format' });
          media = new MessageMedia(matches[1], matches[2], filename || null);
        } else {
          media = await MessageMedia.fromUrl(media_url, { unsafeMime: true });
        }

        if (filename) media.filename = filename;

        const mediaOptions = {};
        if (content) mediaOptions.caption = content;

        await client.sendMessage(statusChatId, media, mediaOptions);

        logger.info({ session_id, type }, 'Media status posted');
        res.json({
          session_id,
          status: 'posted',
          type
        });
        break;
      }

      default:
        return res.status(400).json({ error: `Unsupported status type: ${type}. Use text, image, or video.` });
    }
  } catch (err) {
    logger.error({ err }, 'Error posting status');
    res.status(500).json({ error: 'Failed to post status', details: err.message });
  }
});

module.exports = router;
