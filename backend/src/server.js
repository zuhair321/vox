// VOX backend entrypoint.
// Wires Express + Socket.io on top of Prisma and mounts the route layer.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env, isAllowedOrigin } from './lib/env.js';
import { initSockets, getIO } from './sockets/index.js';
import { initBroadcaster } from './lib/broadcaster.js';
import { errorHandler, notFound } from './middleware/error.js';
import {
  securityMiddleware,
  requestLogger,
  rateLimitMiddleware,
} from './middleware/security.js';
import { requireAuth } from './middleware/auth.js';
import { startDiscovery, stopDiscovery } from './lib/discovery.js';
import { logMetrics } from './lib/monitoring.js';
import { legalRouter } from './routes/legal.routes.js';
import { monitorPerformance, monitorDatabaseQueries } from './middleware/performance.js';

// ── Crash resilience ──────────────────────────────────────────
// After an uncaughtException the process state is undefined, so the correct
// behaviour is to log and exit and let the supervisor (PM2 / Electron) restart
// a clean process — NOT to keep serving requests from a corrupted process.
// The per-request Express error handler still catches all route errors so a
// single bad request never reaches here.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason && reason.stack ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err && err.stack ? err.stack : err);
  // Exit so the process manager restarts a clean instance.
  gracefulShutdown('uncaughtException', 1);
});

// ── Route registry ──────────────────────────────────────────
// Routes are mounted lazily/asynchronously (see mountRoutes below) so the HTTP
// port opens immediately and the frontend can start loading in parallel with
// the module imports these routers pull in. Keeping them in a single ordered
// registry preserves the exact mount order the app relies on.
// [prefix, modulePath, exportName, requireAuth?]
const ROUTE_REGISTRY = [
  ['/api/auth', './routes/auth.routes.js', 'authRouter'],
  ['/api', './routes/state.routes.js', 'stateRouter'],
  ['/api', './routes/message.routes.js', 'messageRouter'],
  ['/api', './routes/upload.routes.js', 'uploadRouter'],
  ['/api', './routes/servers.js', 'serverRouter'],
  ['/api', './routes/friends.js', 'friendRouter'],
  ['/api', './routes/dm.js', 'dmRouter'],
  ['/api', './routes/search.js', 'searchRouter'],
  ['/api', './routes/insights.js', 'insightsRouter'],
  ['/api', './routes/invites.js', 'inviteRouter'],
  ['/api', './routes/linkPreview.js', 'linkPreviewRouter'],
  ['/api', './routes/roles.routes.js', 'rolesRouter'],
  ['/api', './routes/permissions.routes.js', 'permissionsRouter'],
  ['/api', './routes/bans.routes.js', 'bansRouter'],
  ['/api', './routes/categories.routes.js', 'categoriesRouter'],
  ['/api', './routes/webhooks.routes.js', 'webhooksRouter'],
  ['/api', './routes/emoji.routes.js', 'emojiRouter'],
  ['/api', './routes/audit.routes.js', 'auditRouter'],
  ['/api', './routes/blocks.routes.js', 'blockRouter'],
  ['/api', './routes/reports.routes.js', 'reportsRouter'],
  ['/api', './routes/readReceipts.routes.js', 'readReceiptRouter'],
  ['/api/admin', './routes/admin.routes.js', 'adminRouter', true],
  ['/api/turbo', './routes/turbo.routes.js', 'turboRouter'],
  ['/api', './routes/mod.routes.js', 'modRouter'],
  ['/api', './routes/notes.routes.js', 'notesRouter'],
  ['/api', './routes/templates.routes.js', 'templatesRouter'],
  ['/api', './routes/apikeys.routes.js', 'apiKeysRouter'],
  ['/api', './routes/archives.routes.js', 'archivesRouter'],
  ['/api', './routes/widget.routes.js', 'widgetRouter'],
  ['/api', './routes/client.routes.js', 'clientRouter'],
  ['/api', './routes/automod.routes.js', 'automodRouter'],
  ['/api', './routes/forums.routes.js', 'forumsRouter'],
  ['/api', './routes/stages.routes.js', 'stagesRouter'],
  ['/api', './routes/soundboard.routes.js', 'soundboardRouter'],
  ['/api', './routes/badges.routes.js', 'badgesRouter'],
  ['/api', './routes/regions.routes.js', 'regionsRouter'],
  ['/api', './routes/activity.routes.js', 'activityRouter'],
  ['/api', './routes/notifications.routes.js', 'notificationsRouter'],
  ['/api', './routes/integrations.routes.js', 'integrationsRouter'],
  ['/api', './routes/feedback.routes.js', 'feedbackRouter'],
  ['/api', './routes/moderation.routes.js', 'moderationRouter'],
  ['/api', './routes/custom-powers.routes.js', 'customPowersRouter'],
  ['/api', './routes/keys.routes.js', 'keysRouter'],
];

// Check database mode at startup. If DATABASE_URL is missing, we default to a
// local SQLite file (see prisma/schema.prisma provider = "sqlite").
if (!process.env.DATABASE_URL) {
  console.warn('[DB] No DATABASE_URL set — defaulting to SQLite at ./vox.db');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

// ── Core middleware ─────────────────────────────────────────
console.log('BOOT_AFTER_IMPORTS', Date.now());
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(securityMiddleware);
app.use(requestLogger);
app.use(rateLimitMiddleware({
  windowMs: env.rateLimit?.windowMs || 60000,
  maxRequests: env.rateLimit?.maxRequests || 100,
}));
// Dynamic CORS: reflect the requesting origin for local-first clients.
//
// VOX is a desktop app (Electron) that loads the built bundle via `loadFile`
// (origin `app://localhost` / `file://`) and talks to the backend on a
// different port. A static origin allow-list breaks the API (and therefore
// registration/login) whenever the renderer's real origin isn't an exact match
// in the list — e.g. a packaged build, a preview server, or a LAN/self-signed
// origin. To keep the app working everywhere it's deployed locally we reflect
// the request Origin for any localhost / 127.0.0.1 / file:// / app:// / mobile
// scheme, while still allowing the explicitly configured production origins.
// Unknown public origins are rejected so we don't become an open CORS proxy.
const corsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;
  if (!origin || isAllowedOrigin(origin)) {
    callback(null, { origin: origin || true, credentials: true });
  } else {
    callback(null, { origin: false });
  }
};

app.use(cors(corsOptionsDelegate));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Performance monitoring (development only)
if (env.NODE_ENV !== 'production') {
  app.use(monitorPerformance());
  app.use(monitorDatabaseQueries());
}

// ── Uploaded files (avatars / banners) ───────────────────────
// Served statically from backend/uploads/ so the frontend can load them with a
// relative /uploads/<file> URL.
//
// Helmet's defaults set Cross-Origin-Resource-Policy: same-origin and
// X-Frame-Options: SAMEORIGIN, which BLOCK the frontend (port 3000) from
// loading images served here (port 4000). We override both for /uploads so
// avatars/banners load cross-origin.
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

// Public, no-auth probes — desktop client-mode uses /api/server-info to
// prove reachability + identity before letting the user submit
// credentials. /api/health is the deeper liveness check (also used by
// the splash probe on cold start in client mode).
app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, ts: Date.now(), uptime: process.uptime(), version: process.env.npm_package_version || 'dev' });
});
app.get('/api/server-info', (_req, res) => {
  res.status(200).json({
    name: 'VOX',
    product: 'vox',
    version: process.env.npm_package_version || 'dev',
    allowRegistration: process.env.VOX_DISABLE_REGISTRATION !== '1',
    crossOriginCookieCapable: true,
  });
});


// ── Health / boot diagnostics (readiness check) ───────────
app.get('/health', async (req, res) => {
  try {
    await import('./lib/prisma.js').then((m) => m.prisma.$queryRaw`SELECT 1`);
    res.json({
      ok: true,
      service: 'vox-backend',
      uptime: Math.round(process.uptime()),
      database: 'connected',
    });
  } catch {
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
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── Lazy route mounting ──────────────────────────────────────
// Import + mount each router in registry order. Done after listen() so the
// port opens immediately; the notFound/errorHandler are attached once all
// routers are mounted so unknown /api paths 404 correctly instead of hanging.
async function mountRoutes() {
  for (const [prefix, modulePath, exportName, needsAuth] of ROUTE_REGISTRY) {
    try {
      const mod = await import(modulePath);
      const router = mod[exportName];
      if (!router) {
        console.error(`[routes] ${modulePath} has no export "${exportName}" — skipping`);
        continue;
      }
      if (needsAuth) {
        app.use(prefix, requireAuth, router);
      } else {
        app.use(prefix, router);
      }
    } catch (err) {
      console.error(`[routes] failed to mount ${modulePath}:`, err && err.stack ? err.stack : err);
    }
  }

  // 404 + error handlers must be registered LAST, after every router.
  app.use(notFound);
  app.use(errorHandler);
}

// ── Graceful shutdown ────────────────────────────────────────
let shuttingDown = false;
function gracefulShutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[vox] received ${signal} — shutting down`);
  try { stopDiscovery(); } catch { /* ignore */ }

  const done = () => process.exit(exitCode);
  // Force-exit after 10s if close() hangs on open sockets.
  const timer = setTimeout(done, 10_000);
  timer.unref?.();
  server.close(() => {
    clearTimeout(timer);
    done();
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => gracefulShutdown(signal, 0));
}

// ── Start ───────────────────────────────────────────────────
async function start() {
  // Sockets + broadcaster before we accept connections.
  await initSockets(server);
  initBroadcaster();

  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      // Another VOX backend already holds this port (e.g. a stray dev
      // process or a second app instance). electron-main.js detects the
      // in-use port and reuses the existing backend, so we exit cleanly
      // instead of crashing with an uncaught exception dialog.
      console.warn(`[vox] port ${env.port} already in use — another VOX backend is running. Reusing it.`);
      process.exit(0);
    }
    console.error('[vox] server error:', err && err.stack ? err.stack : err);
    process.exit(1);
  });

  server.listen(env.port, () => {
    // The string 'listening' is what electron-main.js watches for.
    console.log(`VOX backend listening on http://127.0.0.1:${env.port}`);
    startDiscovery();
    logMetrics();
  });

  // Mount routes after the port is open so startup feels instant.
  await mountRoutes();
}

start().catch((err) => {
  console.error('[vox] fatal error during startup:', err && err.stack ? err.stack : err);
  process.exit(1);
});
