import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

import { standard as rateLimit } from '../middleware/rateLimiter.js';

const router = Router();

// Middleware: require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'ADMIN' && req.user.role !== 'FOUNDER') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ─── Dashboard Stats ──────────────────────────────────────────────

// Rate limiting
router.use(rateLimit);

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalServers,
      totalMessages,
      totalDms,
      onlineUsers,
      newUsersToday,
      messagesToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.message.count({ where: { deleted: false } }),
      prisma.dmMessage.count({ where: { deleted: false } }),
      prisma.user.count({ where: { status: 'ONLINE' } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.message.count({ where: { createdAt: { gte: todayStart }, deleted: false } }),
    ]);

    // Users by status
    const usersByStatus = await prisma.user.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // Users by day (last 30 days)
    const usersByDayRaw = await prisma.$queryRaw`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM "User"
      WHERE createdAt >= ${thirtyDaysAgo}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `;

    // Messages by day (last 30 days)
    const messagesByDayRaw = await prisma.$queryRaw`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM "Message"
      WHERE createdAt >= ${thirtyDaysAgo} AND deleted = false
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `;

    // Top servers by member count
    const topServersRaw = await prisma.server.findMany({
      take: 8,
      orderBy: { members: { _count: 'desc' } },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true, messages: { where: { deleted: false } } } },
      },
    });

    // Recent users
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, username: true, displayName: true,
        role: true, status: true, avatarUrl: true, createdAt: true,
        twoFactorEnabled: true, emailVerified: true,
      },
    });

    // Active servers (had messages in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeServers = await prisma.server.count({
      where: {
        channels: {
          some: {
            messages: {
              some: { createdAt: { gte: sevenDaysAgo } },
            },
          },
        },
      },
    });

    // Format date arrays to fill gaps
    const fillDates = (raw, key) => {
      const map = new Map(raw.map(r => [String(r.date).split('T')[0], Number(r.count)]));
      const result = [];
      for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        result.push({ date: dateStr.slice(5), count: map.get(dateStr) || 0 });
      }
      return result;
    };

    res.json({
      totalUsers,
      totalServers,
      totalMessages,
      totalDms,
      onlineUsers,
      activeServers,
      newUsersToday,
      messagesToday,
      usersByStatus: usersByStatus.map(s => ({ status: s.status, count: s._count.id })),
    usersByDay: fillDates(usersByDayRaw, 'date'),
    messagesByDay: fillDates(messagesByDayRaw, 'date'),
      topServers: topServersRaw.map(s => ({
        id: s.id,
        name: s.name,
        memberCount: s._count.members,
        messageCount: s._count.messages,
      })),
      recentUsers,
      recentMessages: [],
    });
  } catch (e) {
    next(e);
  }
});

// ─── Activity Feed ────────────────────────────────────────────────
router.get('/activity', requireAdmin, async (req, res) => {
  try {
    const recentAudit = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        server: { select: { id: true, name: true } },
      },
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, displayName: true, createdAt: true },
    });

    const activity = [
      ...recentAudit.map(log => ({
        type: 'audit',
        description: `${log.user.displayName || log.user.username} performed ${log.action.replace(/_/g, ' ').toLowerCase()} in ${log.server.name}`,
        timestamp: log.createdAt,
        userId: log.userId,
        username: log.user.username,
      })),
      ...recentUsers.map(u => ({
        type: 'user',
        description: `${u.displayName || u.username} joined VOX`,
        timestamp: u.createdAt,
        userId: u.id,
        username: u.username,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

    res.json(activity);
  } catch (e) {
    next(e);
  }
});

// ─── Users ────────────────────────────────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { search = '', page = '1', limit = '25', status, role } = req.query;
    const take = Math.min(Number(limit) || 25, 100);
    const skip = (Number(page) - 1) * take;

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { displayName: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, username: true, displayName: true,
          role: true, status: true, avatarUrl: true, bannerUrl: true,
          bio: true, twoFactorEnabled: true, emailVerified: true,
          createdAt: true, lastLoginAt: true,
          _count: { select: { channelMessages: true, serverMembers: true, dmsSent: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (e) {
    next(e);
  }
});

router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, username: true, displayName: true,
        role: true, status: true, avatarUrl: true, bannerUrl: true,
        bio: true, twoFactorEnabled: true, emailVerified: true,
        createdAt: true, lastLoginAt: true,
        ownedServers: {
          select: { id: true, name: true, icon: true, createdAt: true },
        },
        serverMembers: {
          take: 20,
          include: {
            server: { select: { id: true, name: true, icon: true } },
          },
        },
        refreshTokens: {
          where: { revoked: false, expiresAt: { gt: new Date() } },
          select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, revoked: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { channelMessages: true, serverMembers: true, dmsSent: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { displayName, bio, role, status } = req.body;
    const data = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (bio !== undefined) data.bio = bio;
    if (role !== undefined) data.role = role;
    if (status !== undefined) data.status = status;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, username: true, displayName: true, role: true, status: true },
    });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'OFFLINE', lockedUntil: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'OFFLINE', lockedUntil: null, loginAttempts: 0 },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('User delete error:', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/users/:id/sessions', requireAdmin, async (req, res) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: req.params.id, revoked: false, expiresAt: { gt: new Date() } },
      select: { id: true, deviceInfo: true, ipAddress: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ sessions });
  } catch (e) {
    next(e);
  }
});

// ─── Servers ──────────────────────────────────────────────────────
router.get('/servers', requireAdmin, async (req, res) => {
  try {
    const { search = '', page = '1', limit = '25' } = req.query;
    const take = Math.min(Number(limit) || 25, 100);
    const skip = (Number(page) - 1) * take;

    const where = {};
    if (search) {
      where.name = { contains: search };
    }

    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          _count: { select: { members: true, channels: true, messages: { where: { deleted: false } } } },
        },
      }),
      prisma.server.count({ where }),
    ]);

    res.json({ servers, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (e) {
    next(e);
  }
});

router.get('/servers/:id', requireAdmin, async (req, res) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      include: {
        owner: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        channels: { select: { id: true, name: true, type: true, position: true }, orderBy: { position: 'asc' } },
        members: {
          take: 50,
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
          },
        },
        invites: { select: { code: true, uses: true, maxUses: true, expiresAt: true } },
        webhooks: { select: { id: true, name: true, channelId: true } },
        auditLogs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true, displayName: true } },
            server: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!server) return res.status(404).json({ error: 'Server not found' });
    res.json({ server });
  } catch (e) {
    next(e);
  }
});

router.delete('/servers/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.server.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('Server delete error:', e);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

router.patch('/servers/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, isPublic, category } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (category !== undefined) data.category = category;

    const server = await prisma.server.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, description: true, isPublic: true, category: true },
    });
    res.json({ server });
  } catch (e) {
    next(e);
  }
});

// ─── Messages ─────────────────────────────────────────────────────
router.get('/messages', requireAdmin, async (req, res) => {
  try {
    const { search = '', page = '1', limit = '25', channelId } = req.query;
    const take = Math.min(Number(limit) || 25, 100);
    const skip = (Number(page) - 1) * take;

    const where = {};
    if (search) {
      where.body = { contains: search };
    }
    if (channelId) {
      where.channelId = channelId;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          channel: {
            select: {
              id: true, name: true,
              server: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.message.count({ where }),
    ]);

    res.json({ messages, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (e) {
    next(e);
  }
});

router.delete('/messages/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.message.update({
      where: { id: req.params.id },
      data: { deleted: true, body: '[Message deleted by admin]' },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── Reports ──────────────────────────────────────────────────────
router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const { status, page = '1', limit = '25' } = req.query;
    const take = Math.min(Number(limit) || 25, 100);
    const skip = (Number(page) - 1) * take;

    const where = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, username: true, displayName: true } },
          reportedUser: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    res.json({ reports, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (e) {
    next(e);
  }
});

router.patch('/reports/:id', requireAdmin, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
        reportedUser: { select: { id: true, username: true, displayName: true } },
      },
    });
    res.json({ report });
  } catch (e) {
    next(e);
  }
});

// ─── Audit Logs ───────────────────────────────────────────────────
router.get('/audit', requireAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '50', action } = req.query;
    const take = Math.min(Number(limit) || 50, 100);
    const skip = (Number(page) - 1) * take;

    const where = {};
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          server: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (e) {
    next(e);
  }
});

// ─── System Health ────────────────────────────────────────────────
router.get('/health', requireAdmin, async (req, res) => {
  try {
    // DB latency
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    // DB version
    const dbVersionRaw = await prisma.$queryRaw`SELECT VERSION() as v`;
    const dbVersion = (dbVersionRaw)[0]?.v || 'unknown';

    // Redis latency (try to ping)
    let redisLatency = 0;
    let redisConnected = false;
    let redisMemory = 'N/A';
    try {
      const { redisHealthCheck } = await import('../lib/redis.js');
      const redisHealth = await redisHealthCheck();
      redisConnected = redisHealth.status === 'connected';
      redisLatency = redisHealth.latencyMs || 0;
      redisMemory = redisHealth.usedMemory || 'N/A';
    } catch {}

    const memUsage = process.memoryUsage();

    const [userCount, serverCount, messageCount, channelCount] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.message.count({ where: { deleted: false } }),
      prisma.channel.count(),
    ]);

    res.json({
      database: { connected: true, latency: dbLatency, version: dbVersion },
      redis: { connected: redisConnected, latency: redisLatency, memory: redisMemory },
      server: {
        uptime: Math.floor(process.uptime()),
        memory: { used: memUsage.heapUsed, total: memUsage.heapTotal },
        cpu: process.cpuUsage().user,
        nodeVersion: process.version,
      },
      counts: { users: userCount, servers: serverCount, messages: messageCount, channels: channelCount },
    });
  } catch (e) {
    next(e);
  }
});

// ─── Config ───────────────────────────────────────────────────────
router.get('/config', requireAdmin, async (req, res) => {
  res.json({
    registrationOpen: true,
    maxFileSize: process.env.MAX_FILE_SIZE_MB ? Number(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 : 10 * 1024 * 1024,
    maintenanceMode: false,
  });
});

export { router as adminRouter };
