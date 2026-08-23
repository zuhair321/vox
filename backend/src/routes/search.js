// Full-text-ish message search.
//   GET /api/search?q=&channelId=&serverId=&userId=&hasLink=&before=&after=&limit=
//
// SQLite doesn't have full-text tables in this schema, so we use Prisma's
// `contains` (LIKE %q%) which is case-insensitive on SQLite by default.
// Filters compose safely with the spread-on-truthy pattern so unspecified
// params never constrain the query.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { sanitize } from '../middleware/sanitize.js';

export const searchRouter = Router();

// Rate limit search to prevent abuse.
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many searches. Please slow down.' },
});

const MESSAGE_INCLUDE = {
  author: true,
  reactions: true,
  channel: { include: { server: true } },
};

searchRouter.get('/search', requireAuth, searchLimiter, async (req, res, next) => {
  try {
    const q = sanitize(String(req.query.q || ''));
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    if (!q) throw new HttpError(400, 'Search query is required.');

    // SECURITY: Scope results to channels the user can actually read.
    // Resolve the user's server memberships first, then restrict to channels
    // in those servers (or an explicitly requested channel they can access).
    const channelId = req.query.channelId ? String(req.query.channelId) : '';
    const serverId = req.query.serverId ? String(req.query.serverId) : '';

    let accessibleChannelIds = null;

    if (channelId) {
      // Explicit channel: verify the user is a member of its server.
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { server: { include: { members: { where: { userId: req.user.id } } } } },
      });
      if (!channel || channel.server.members.length === 0) {
        return res.json({ results: [], count: 0 });
      }
      accessibleChannelIds = [channelId];
    } else if (serverId) {
      // Explicit server: verify membership.
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: req.user.id } },
      });
      if (!member) return res.json({ results: [], count: 0 });
      const serverChannels = await prisma.channel.findMany({
        where: { serverId },
        select: { id: true },
      });
      accessibleChannelIds = serverChannels.map((c) => c.id);
    } else {
      // No scope: restrict to all servers the user is a member of.
      const memberships = await prisma.serverMember.findMany({
        where: { userId: req.user.id },
        select: { serverId: true },
      });
      const memberServerIds = memberships.map((m) => m.serverId);
      if (memberServerIds.length === 0) return res.json({ results: [], count: 0 });
      const channels = await prisma.channel.findMany({
        where: { serverId: { in: memberServerIds } },
        select: { id: true },
      });
      accessibleChannelIds = channels.map((c) => c.id);
    }

    if (!accessibleChannelIds || accessibleChannelIds.length === 0) {
      return res.json({ results: [], count: 0 });
    }

    // ILIKE-based search — reliable regardless of searchVector state.
    const chPlaceholders = accessibleChannelIds.map((_, i) => `$${i + 1}`).join(',');
    const searchIdx = accessibleChannelIds.length + 1;

    let sql = `SELECT m.id, 0 AS rank FROM "Message" m WHERE m.deleted = false AND m."channelId" IN (${chPlaceholders}) AND m.body ILIKE $${searchIdx}`;
    const params = [...accessibleChannelIds, `%${q}%`];

    // Scope to one author.
    const userParam = req.query.userId ? String(req.query.userId).trim() : '';
    if (userParam) {
      const stripped = userParam.replace(/^@/, '');
      const user = await prisma.user.findUnique({
        where: { username: stripped },
        select: { id: true },
      });
      if (user) {
        sql += ` AND m."userId" = $${params.length + 1}`;
        params.push(user.id);
      } else {
        sql += ` AND m."userId" = $${params.length + 1}`;
        params.push(userParam);
      }
    }

    // Date bounds.
    if (req.query.before) {
      sql += ` AND m."createdAt" < $${params.length + 1}`;
      params.push(new Date(String(req.query.before)));
    }
    if (req.query.after) {
      sql += ` AND m."createdAt" > $${params.length + 1}`;
      params.push(new Date(String(req.query.after)));
    }

    // "has link" filter: body must contain an http(s) URL.
    if (req.query.hasLink === 'true' || req.query.hasLink === '1') {
      sql += ` AND m.body LIKE '%http%'`;
    }

    sql += ` ORDER BY rank DESC, m."createdAt" DESC LIMIT ${limit}`;

    const matchedRows = await prisma.$queryRawUnsafe(sql, ...params);
    const matchedIds = matchedRows.map((r) => r.id);
    if (matchedIds.length === 0) {
      return res.json({ results: [], count: 0 });
    }

    const results = await prisma.message.findMany({
      where: { id: { in: matchedIds } },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ results, count: results.length });
  } catch (e) { next(e); }
});
