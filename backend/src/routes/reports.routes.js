// Report routes — user-submitted reports for moderation
import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const reportsRouter = Router();

// POST /api/reports — submit a report
reportsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { reportedUserId, messageId, serverId, type, reason, details } = req.body || {};
    if (!type || !reason) {
      return res.status(400).json({ error: 'type and reason are required' });
    }
    const validTypes = ['user', 'message', 'server'];
    const validReasons = ['spam', 'harassment', 'inappropriate', 'unsafe', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    const report = {
      id: crypto.randomUUID(),
      reporterId: req.user.id,
      reportedUserId: reportedUserId || null,
      messageId: messageId || null,
      serverId: serverId || null,
      type,
      reason,
      details: details ? String(details).substring(0, 2000) : null,
      status: 'pending',
    };

    await prisma.$executeRaw`
      INSERT INTO report (id, reporterId, reportedUserId, messageId, serverId, type, reason, details, status)
      VALUES (
        ${report.id}, ${report.reporterId}, ${report.reportedUserId},
        ${report.messageId}, ${report.serverId}, ${report.type},
        ${report.reason}, ${report.details}, ${report.status}
      )
    `;

    res.status(201).json({ report, submitted: true });
  } catch (e) { next(e); }
});

// GET /api/reports — list reports (admin only — for server admins)
reportsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { serverId, status } = req.query;

    // Admin check — only server admins can see reports
    if (serverId) {
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: String(serverId), userId: req.user.id } },
      });
      if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    let query = 'SELECT * FROM report WHERE 1=1';
    const params = [];
    if (serverId) { query += ' AND serverId = ?'; params.push(serverId); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY createdAt DESC LIMIT 50';

    const reports = await prisma.$queryRaw(query, ...params);
    res.json({ reports });
  } catch (e) { next(e); }
});
