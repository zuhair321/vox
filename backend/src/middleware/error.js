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

// eslint-disable-next-line no-unused-vars
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
  }

  return res.status(status).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
}

// 404 for unknown routes
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}
