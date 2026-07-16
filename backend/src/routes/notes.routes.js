// User notes — private notes about other users.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';

export const notesRouter = Router();

// GET /api/users/:id/notes — get my note about a user
notesRouter.get('/users/:id/notes', requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const note = await prisma.userNote.findUnique({
      where: { userId_targetId: { userId: req.user.id, targetId } },
    });
    res.json({ note: note ? { text: note.text, updatedAt: note.updatedAt } : null });
  } catch (e) { next(e); }
});

// PUT /api/users/:id/notes — set/update my note about a user
notesRouter.put('/users/:id/notes', requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const { text } = req.body;

    if (targetId === req.user.id) throw new HttpError(400, 'Cannot add a note about yourself.');

    // Verify target user exists
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, 'User not found.');

    const sanitized = sanitize(String(text || '')).slice(0, 500);

    const note = await prisma.userNote.upsert({
      where: { userId_targetId: { userId: req.user.id, targetId } },
      create: { userId: req.user.id, targetId, text: sanitized },
      update: { text: sanitized },
    });

    res.json({ note: { text: note.text, updatedAt: note.updatedAt } });
  } catch (e) { next(e); }
});

// DELETE /api/users/:id/notes — remove my note about a user
notesRouter.delete('/users/:id/notes', requireAuth, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    await prisma.userNote.deleteMany({
      where: { userId: req.user.id, targetId },
    });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// GET /api/users/me/notes — get all my notes
notesRouter.get('/users/me/notes', requireAuth, async (req, res, next) => {
  try {
    const notes = await prisma.userNote.findMany({
      where: { userId: req.user.id },
      include: {
        target: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ notes });
  } catch (e) { next(e); }
});
