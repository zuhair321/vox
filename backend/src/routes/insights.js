// Server insights / analytics dashboard.
//   GET /api/servers/:id/insights?period=7d|30d|90d
//
// Aggregates member counts, message volume, channel activity, and top members
// over the requested period. Owner/Admin only.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

export const insightsRouter = Router();

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

async function assertCanManage(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Insights are restricted to owners and admins.');
  }
}

insightsRouter.get('/servers/:id/insights', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    await assertCanManage(serverId, req.user.id);

    const periodKey = PERIOD_DAYS[String(req.query.period || '7d')] ? String(req.query.period || '7d') : '7d';
    const days = PERIOD_DAYS[periodKey];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { channels: true },
    });
    if (!server) throw new HttpError(404, 'Server not found.');

    const channelIds = server.channels.map((c) => c.id);

    const [totalMembers, totalMessages, periodMessages, newJoins] = await Promise.all([
      prisma.serverMember.count({ where: { serverId } }),
      prisma.message.count({ where: { channelId: { in: channelIds }, deleted: false } }),
      prisma.message.count({
        where: { channelId: { in: channelIds }, deleted: false, createdAt: { gte: since } },
      }),
      prisma.serverMember.count({ where: { serverId, joinedAt: { gte: since } } }),
    ]);

    // Active members: distinct users who sent ≥1 message in the period.
    const activeAgg = await prisma.message.groupBy({
      by: ['userId'],
      where: { channelId: { in: channelIds }, deleted: false, createdAt: { gte: since }, userId: { not: null } },
      _count: { _all: true },
    });
    const activeMembers = activeAgg.filter((a) => a.userId).length;

    // Per-channel activity in the period.
    const channelAgg = await prisma.message.groupBy({
      by: ['channelId'],
      where: { channelId: { in: channelIds }, deleted: false, createdAt: { gte: since } },
      _count: { _all: true },
    });
    const channelActivity = channelAgg
      .map((row) => {
        const ch = server.channels.find((c) => c.id === row.channelId);
        return { channelId: row.channelId, name: ch?.name || 'unknown', count: row._count._all };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Top members by message count in the period.
    const topIds = activeAgg
      .map((a) => ({ userId: a.userId, count: a._count._all }))
      .filter((a) => a.userId)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const topUsers = topIds.length
      ? await prisma.user.findMany({ where: { id: { in: topIds.map((t) => t.userId) } } })
      : [];
    const topMembers = topIds.map((t) => {
      const u = topUsers.find((x) => x.id === t.userId);
      return { userId: t.userId, username: u?.username || u?.displayName || 'Unknown', count: t.count };
    });

    res.json({
      period: periodKey,
      totalMembers,
      totalMessages,
      periodMessages,
      activeMembers,
      newJoins,
      channelActivity,
      topMembers,
    });
  } catch (e) { next(e); }
});


// GET /api/servers/:id/insights/series?period=7d|30d|90d
//
// Returns a per-day timeseries for the requested period.
// Used by ServerInsights.tsx to render the activity-over-time line chart.
// All counts are inclusive of soft-deleted messages? No — we honour `deleted: false`.
insightsRouter.get('/servers/:id/insights/series', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    await assertCanManage(serverId, req.user.id);

    const periodKey = PERIOD_DAYS[String(req.query.period || '7d')] ? String(req.query.period || '7d') : '7d';
    const days = PERIOD_DAYS[periodKey];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { channels: { select: { id: true } } },
    });
    if (!server) throw new HttpError(404, 'Server not found.');

    const channelIds = server.channels.map((c) => c.id);
    const bucketStart = new Date(since);
    bucketStart.setUTCHours(0, 0, 0, 0);

    // Build empty per-day buckets in UTC so the chart renders a continuous axis.
    const labels = [];
    const messagesBucket = {};
    const joinsBucket = {};
    const peakBucket = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(bucketStart.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      messagesBucket[key] = 0;
      joinsBucket[key] = 0;
      peakBucket[key] = 0;
    }

    // Per-day message counts. groupBy is cheaper than raw-fetch-and-reduce.
    const msgAgg = await prisma.message.groupBy({
      by: ['createdAt'],
      where: {
        channelId: { in: channelIds },
        deleted: false,
        createdAt: { gte: bucketStart },
      },
      _count: { _all: true },
    }).catch(() => []);
    msgAgg.forEach((row) => {
      const key = row.createdAt.toISOString().slice(0, 10);
      if (key in messagesBucket) messagesBucket[key] += row._count._all;
    });

    const memberAgg = await prisma.serverMember.findMany({
      where: { serverId, joinedAt: { gte: bucketStart } },
      select: { joinedAt: true },
    });
    memberAgg.forEach((row) => {
      const key = row.joinedAt.toISOString().slice(0, 10);
      if (key in joinsBucket) joinsBucket[key] += 1;
    });

    // Peak concurrent is a stand-in until a presence endpoint exists.
    // For now we use "messages on that day" as a busy-day proxy — chart-friendly.
    Object.keys(messagesBucket).forEach((key) => {
      peakBucket[key] = messagesBucket[key];
    });

    res.json({
      period: periodKey,
      labels,
      messages: labels.map((k) => messagesBucket[k]),
      joins: labels.map((k) => joinsBucket[k]),
      peak: labels.map((k) => peakBucket[k]),
    });
  } catch (e) { next(e); }
});
