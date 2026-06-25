// Full-text-ish message search.
//   GET /api/search?q=&channelId=&serverId=&userId=&hasLink=&before=&after=&limit=
//
// SQLite doesn't have full-text tables in this schema, so we use Prisma's
// `contains` (LIKE %q%) which is case-insensitive on SQLite by default.
// Filters compose safely with the spread-on-truthy pattern so unspecified
// params never constrain the query.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

export const searchRouter = Router();

const MESSAGE_INCLUDE = {
  author: true,
  reactions: true,
  channel: { include: { server: true } },
};

searchRouter.get('/search', requireAuth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    // Base where: deleted messages never surface, and (if a query term was
    // supplied) body must contain it.
    const where = { deleted: false };
    if (q) where.body = { contains: q };

    // Scope to a single channel if requested.
    const channelId = req.query.channelId ? String(req.query.channelId) : '';
    if (channelId) where.channelId = channelId;

    // Scope to a single server: resolve its channel ids first.
    const serverId = req.query.serverId ? String(req.query.serverId) : '';
    if (serverId && !channelId) {
      const serverChannels = await prisma.channel.findMany({
        where: { serverId },
        select: { id: true },
      });
      where.channelId = { in: serverChannels.map((c) => c.id) };
    }

    // Scope to one author.
    const userId = req.query.userId ? String(req.query.userId) : '';
    if (userId) where.userId = userId;

    // Date bounds (ISO strings → Date).
    if (req.query.before) where.createdAt = { ...where.createdAt, lt: new Date(String(req.query.before)) };
    if (req.query.after) where.createdAt = { ...where.createdAt, gt: new Date(String(req.query.after)) };

    // "has link" filter: body must contain an http(s) URL.
    if (req.query.hasLink === 'true' || req.query.hasLink === '1') {
      // Prisma has no native regex; emulate with a URL pattern via contains on
      // the common 'http' substring (covers http and https).
      where.body = { ...where.body, contains: 'http' };
    }

    const results = await prisma.message.findMany({
      where,
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ results, count: results.length });
  } catch (e) { next(e); }
});
