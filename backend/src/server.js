// VOX backend entrypoint.
// Wires Express + Socket.io on top of Prisma/PostgreSQL and mounts the route layer.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './lib/env.js';
import { initSockets } from './sockets/index.js';
import { authRouter } from './routes/auth.routes.js';
import { stateRouter } from './routes/state.routes.js';
import { messageRouter } from './routes/message.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { serverRouter } from './routes/servers.js';
import { friendRouter } from './routes/friends.js';
import { dmRouter } from './routes/dm.js';
import { searchRouter } from './routes/search.js';
import { insightsRouter } from './routes/insights.js';
import { inviteRouter } from './routes/invites.js';
import { linkPreviewRouter } from './routes/linkPreview.js';
import { rolesRouter } from './routes/roles.routes.js';
import { permissionsRouter } from './routes/permissions.routes.js';
import { bansRouter } from './routes/bans.routes.js';
import { categoriesRouter } from './routes/categories.routes.js';
import { webhooksRouter } from './routes/webhooks.routes.js';
import { emojiRouter } from './routes/emoji.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { blockRouter } from './routes/blocks.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { readReceiptRouter } from './routes/readReceipts.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { turboRouter } from './routes/turbo.routes.js';
import { legalRouter } from './routes/legal.routes.js';
import { clientRouter } from './routes/client.routes.js';
import { requireAuth } from './middleware/auth.js';
import { startDiscovery, stopDiscovery } from './lib/discovery.js';
import { errorHandler, notFound } from './middleware/error.js';
import { getIO } from './sockets/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

// ── Core middleware ─────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false })); // CSP off for local API dev
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ── Uploaded files (avatars / banners) ───────────────────────
// Served statically from backend/uploads/ so the frontend (and the ngrok
// tunnel) can load them with a relative /uploads/<file> URL.
//
// Helmet's defaults set Cross-Origin-Resource-Policy: same-origin and
// X-Frame-Options: SAMEORIGIN, which BLOCK the frontend (port 3000) from
// loading images served here (port 4000) — the browser shows a broken-image
// icon. We override both for /uploads so avatars/banners load cross-origin.
app.use(
  '/uploads',
  (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
    next();
  },
  express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '1h',
  }),
);

// ── Legal / public pages (privacy policy for Play Console + in-app) ──
app.use(legalRouter);

// ── Health / boot diagnostics (readiness check) ───────────
app.get('/health', async (req, res) => {
  try {
    // Probe database connection
    await import('./lib/prisma.js').then(m => m.prisma.$queryRaw`SELECT 1`);
    res.json({
      ok: true,
      service: 'vox-backend',
      uptime: Math.round(process.uptime()),
      database: 'connected',
    });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'Database unreachable' });
  }
});

// ── Detailed health / diagnostics ────────────────────────────
app.get('/health/detailed', async (req, res) => {
  try {
    const { prisma } = await import('./lib/prisma.js');
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch { /* ignore */ }

    const io = getIO();
    const socketCount = io ? io.engine.clientsCount : 0;

    res.json({
      status: 'ok',
      db: dbStatus,
      uptime: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage(),
      socketCount,
      activeUsers: 0,
    });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api', stateRouter);
app.use('/api', messageRouter);
app.use('/api', uploadRouter);
app.use('/api', serverRouter);
app.use('/api', friendRouter);
app.use('/api', dmRouter);
app.use('/api', searchRouter);
app.use('/api', insightsRouter);
app.use('/api', inviteRouter);
app.use('/api', linkPreviewRouter);
app.use('/api', rolesRouter);
app.use('/api', permissionsRouter);
app.use('/api', bansRouter);
app.use('/api', categoriesRouter);
app.use('/api', webhooksRouter);
app.use('/api', emojiRouter);
app.use('/api', auditRouter);
app.use('/api', blockRouter);
app.use('/api', reportsRouter);
app.use('/api', readReceiptRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/turbo', turboRouter);
app.use('/api', clientRouter);

app.use(notFound);
app.use(errorHandler);

// ── Sockets ─────────────────────────────────────────────────
await initSockets(server);

// ── Start ───────────────────────────────────────────────────
server.listen(env.port, () => {
  // The string 'listening' is what electron-main.js watches for.
  console.log(`VOX backend listening on http://127.0.0.1:${env.port}`);
  startDiscovery();
});

// Graceful shutdown so Prisma disconnects cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopDiscovery();
    server.close(() => process.exit(0));
  });
}
