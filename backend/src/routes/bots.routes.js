// Bots: lightweight bot accounts.
// Bots use a long-lived token (similar to API keys). They live in the User table
// with `isBot = true`; their ServerMember rows are how they appear in the
// member list. Bots post via `/api/bots/:botId/post` using an `X-Bot-Token`
// header so anyone running a bot doesn't need a browser session.
import crypto from 'node:crypto';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

export const botsRouter = Router();

async function authenticateBot(req) {
  const token = String(req.get('x-bot-token') || '');
  if (!token) return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return prisma.user.findFirst({ where: { isBot: true, botTokenHash: hash } });
}

// POST /api/servers/:id/bots  (admin/founder only).

// Rate limiting
botsRouter.use(rateLimit);

botsRouter.post('/servers/:id/bots', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { name, displayName, color } = req.body || {};
    if (!name || typeof name !== 'string' || !/^[a-z0-9_-]{2,24}$/.test(name)) {
      throw new HttpError(400, 'name must be 2-24 chars: lowercase letters/digits/underscore/dash only.');
    }
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
      throw new HttpError(403, 'Only founders and admins can add bots to this server.');
    }

    const existing = await prisma.user.findUnique({ where: { username: name } });
    if (existing) throw new HttpError(409, 'A user with that name already exists.');

    const token = 'voxbot_' + crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const bot = await prisma.user.create({
      data: {
        username: name,
        displayName: String(displayName || name).slice(0, 32),
        passwordHash: '!bot-account',
        email: name + '@voxbot.local',
        color: typeof color === 'string' ? color : '#9B824F',
        isBot: true,
        botTokenHash: tokenHash,
        role: 'MEMBER',
        status: 'OFFLINE',
      },
    });

    await prisma.serverMember.upsert({
      where: { serverId_userId: { serverId, userId: bot.id } },
      create: { serverId, userId: bot.id, role: 'BOT' },
      update: { role: 'BOT' },
    });

    res.status(201).json({
      bot: { id: bot.id, username: bot.username, displayName: bot.displayName, color: bot.color },
      token,
    });
  } catch (e) { next(e); }
});

botsRouter.get('/servers/:id/bots', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const members = await prisma.serverMember.findMany({
      where: { serverId, user: { isBot: true } },
      include: { user: { select: { id: true, username: true, displayName: true, color: true } } },
    });
    res.json({ bots: members.map((m) => ({ id: m.user.id, username: m.user.username, displayName: m.user.displayName, color: m.user.color, role: m.role })) });
  } catch (e) { next(e); }
});

botsRouter.delete('/servers/:id/bots/:botId', requireAuth, async (req, res, next) => {
  try {
    const { id: serverId, botId } = req.params;
    const me = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!me || !['FOUNDER', 'ADMIN', 'MODERATOR'].includes(me.role)) {
      throw new HttpError(403, 'Not authorised.');
    }
    const bot = await prisma.user.findUnique({ where: { id: botId } });
    if (!bot || !bot.isBot) throw new HttpError(404, 'Bot not found.');

    await prisma.serverMember.deleteMany({ where: { serverId, userId: botId } });
    res.json({ removed: true });
  } catch (e) { next(e); }
});

botsRouter.post('/bots/:botId/post', async (req, res, next) => {
  try {
    const bot = await authenticateBot(req);
    if (!bot || bot.id !== req.params.botId) throw new HttpError(401, 'Invalid bot token.');

    const { channelId, body, parentId } = req.body || {};
    if (!channelId || !body || typeof body !== 'string') {
      throw new HttpError(400, 'channelId and body are required.');
    }
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new HttpError(404, 'Channel not found.');
    if (channel.serverId) {
      const sm = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId: bot.id } },
      });
      if (!sm) throw new HttpError(403, 'Bot is not a member of that channel.');
    }
    if (body.length > 2000) {
      throw new HttpError(400, 'body is too long (max 2000 chars).');
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        userId: bot.id,
        body: body.trim(),
        parentId: parentId || null,
      },
      include: { author: true },
    });

    try {
      const { getIO } = await import('../sockets/index.js');
      const io = getIO();
      if (io) io.to('channel:' + channelId).emit('message:new', { message });
    } catch (_) { /* sockets optional */ }

    res.status(201).json({ message });
  } catch (e) { next(e); }
});

botsRouter.post('/bots/:botId/react', async (req, res, next) => {
  try {
    const bot = await authenticateBot(req);
    if (!bot || bot.id !== req.params.botId) throw new HttpError(401, 'Invalid bot token.');

    const { messageId, emoji } = req.body || {};
    if (!messageId || !emoji) throw new HttpError(400, 'messageId and emoji are required.');
    const reaction = await prisma.reaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId: bot.id, emoji } },
      create: { messageId, userId: bot.id, emoji },
      update: {},
    });
    res.status(201).json({ reaction });
  } catch (e) { next(e); }
});

export const botAuthenticate = authenticateBot;
export { botsRouter as default };
