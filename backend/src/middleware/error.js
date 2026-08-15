// Centralized error handling.
// Express 5 throws async rejections into here automatically, so routes
// can just `throw new HttpError(400, 'bad')` or pass to next().
import { Prisma } from '@prisma/client';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, req, res, next) {
  // Prisma unique-constraint violations → 409 Conflict
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const rawTarget = err.meta?.target;
    const target = Array.isArray(rawTarget) ? rawTarget.join(', ') : rawTarget || 'field';
    return res.status(409).json({ error: `That ${target} is already taken.` });
  }

  const status = err.status || 500;
  const message = err.expose ? err.message : (status >= 500 ? 'Internal server error.' : err.message);

  if (status >= 500) {
    console.error('[unhandled error]', err);
    reportError(err, req).catch(() => {});
  }

  return res.status(status).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
}

// Best-effort error alerting (observability). Posts 5xx stack traces to a
// configured webhook (e.g. Slack/Discord/Sentry ingest) when
// ERROR_WEBHOOK_URL is set. No-op otherwise.
async function reportError(err, req) {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    const payload = {
      text: `🚨 VOX 5xx on ${req.method} ${req.originalUrl}\n\`\`\`${String(err.stack || err.message).replace(/\/[^\s:]+/g, '[path]').slice(0, 1800)}\`\`\``,
    };
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { /* swallow — never block the error response */ }
}


// 404 for unknown routes
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}
