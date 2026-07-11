import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const categoriesRouter = Router();

async function requireAdmin(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
    throw new HttpError(403, 'Not authorized');
  }
}

// GET /api/servers/:id/categories
categoriesRouter.get('/servers/:id/categories', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member) throw new HttpError(403, 'Not a member of this server');

    const categories = await prisma.category.findMany({
      where: { serverId },
      include: { channels: true },
      orderBy: { position: 'asc' },
    });

    res.json({ categories });
  } catch (e) { next(e); }
});

// POST /api/servers/:id/categories
categoriesRouter.post('/servers/:id/categories', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const { name, position } = req.body || {};

    if (!name || typeof name !== 'string') throw new HttpError(400, 'name is required');

    await requireAdmin(serverId, req.user.id);

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        position: typeof position === 'number' ? position : 0,
        serverId,
      },
      include: { channels: true },
    });

    res.status(201).json({ category });
  } catch (e) { next(e); }
});

// PATCH /api/servers/:id/categories/:categoryId
categoriesRouter.patch('/servers/:id/categories/:categoryId', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const categoryId = req.params.categoryId;
    const { name, position } = req.body || {};

    await requireAdmin(serverId, req.user.id);

    const data = {};
    if (typeof name === 'string') data.name = name.trim();
    if (typeof position === 'number') data.position = position;

    const existing = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existing || existing.serverId !== serverId) throw new HttpError(404, 'Category not found');

    const category = await prisma.category.update({
      where: { id: categoryId },
      data,
      include: { channels: true },
    });

    res.json({ category });
  } catch (e) { next(e); }
});

// DELETE /api/servers/:id/categories/:categoryId
categoriesRouter.delete('/servers/:id/categories/:categoryId', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const categoryId = req.params.categoryId;

    await requireAdmin(serverId, req.user.id);

    await prisma.channel.updateMany({
      where: { categoryId, serverId },
      data: { categoryId: null },
    });

    const existing = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existing || existing.serverId !== serverId) throw new HttpError(404, 'Category not found');

    await prisma.category.delete({
      where: { id: categoryId },
    });

    res.json({ deleted: true });
  } catch (e) { next(e); }
});
