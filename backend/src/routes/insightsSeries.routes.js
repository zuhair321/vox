// Time-series insights.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

export const insightsSeriesRouter = Router();

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

async function assertCanManage(serverId, userId) {
  const member = await prisma.serverMember.findUnique({ where: { serverId_userId: { serverId, userId } } });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Insights are restricted to owners and admins.');
  }
}

insightsSeriesRouter.get('/servers/:id/insights/series', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    await assertCanManage(serverId, req.user.id);
    const period = PERIOD_DAYS[String(req.query.period || '7d')] ? String(req.query.period || '7d') : '7d';
    const days = PERIOD_DAYS[period];

    const server = await prisma.server.findUnique({ where: { id: serverId }, include: { channels: true } });
    if (!server) throw new HttpError(404, 'Server not found.');
    const channelIds = server.channels.map((c) => c.id);

    const labels = [];
    const messages = [];
    const joins = [];
    const peak = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const m = await prisma.message.count({
        where: { channelId: { in: channelIds }, deleted: false, createdAt: { gte: start, lt: end } },
      });
      const j = await prisma.serverMember.count({ where: { serverId, joinedAt: { gte: start, lt: end } } });
      const p = await prisma.serverStats.findFirst({
        where: { serverId, date: { gte: start, lt: end } },
        orderBy: { peakConcurrent: 'desc' },
      });
      labels.push(start.toISOString().slice(5, 10));
      messages.push(m);
      joins.push(j);
      peak.push(p ? p.peakConcurrent : 0);
    }

    res.json({ labels, messages, joins, peak });
  } catch (e) { next(e); }
});
