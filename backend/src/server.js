// VOX backend entrypoint.
// Wires Express + Socket.io on top of Prisma/MySQL and mounts the route layer.
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
import { editRouter } from './routes/edit.routes.js';
import { linkPreviewRouter } from './routes/linkPreview.js';
import { errorHandler, notFound } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

// ── Core middleware ─────────────────────────────────────────
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

// ── Health / boot diagnostics ───────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'vox-backend', uptime: Math.round(process.uptime()) });
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api', stateRouter);      // GET /api/state, POST /api/nitro/claim
app.use('/api', messageRouter);    // POST /api/messages, reactions
app.use('/api', uploadRouter);     // POST /api/upload/avatar|banner
app.use('/api', serverRouter);
app.use('/api', friendRouter);
app.use('/api', dmRouter);
app.use('/api', searchRouter);
app.use('/api', insightsRouter);
app.use('/api', inviteRouter);
app.use('/api', linkPreviewRouter);
app.use('/api', editRouter);

app.use(notFound);
app.use(errorHandler);

// ── Sockets ─────────────────────────────────────────────────
initSockets(server);

// ── Start ───────────────────────────────────────────────────
server.listen(env.port, () => {
  // The string 'listening' is what electron-main.js watches for.
  console.log(`VOX backend listening on http://127.0.0.1:${env.port}`);
});

// Graceful shutdown so Prisma disconnects cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
