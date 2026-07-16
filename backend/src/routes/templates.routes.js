// Server templates.
//   POST   /api/servers/:id/templates        → save a server as a template
//   GET    /api/templates                    → browse public templates
//   POST   /api/servers/from-template         → create a server from a template
//   DELETE /api/templates/:id                 → delete a template (owner only)
import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';

export const templatesRouter = Router();

function newChannelId() {
  return crypto.randomUUID();
}

// Snapshot a server's structure (categories + channels + roles) into JSON.
async function snapshotServer(serverId) {
  const [categories, channels, roles] = await Promise.all([
    prisma.category.findMany({ where: { serverId } }),
    prisma.channel.findMany({ where: { serverId } }),
    prisma.serverRole.findMany({ where: { serverId } }),
  ]);

  return {
    categories: categories.map((c) => ({ name: c.name, position: c.position })),
    channels: channels.map((c) => ({
      name: c.name,
      type: c.type,
      topic: c.topic,
      position: c.position,
      nsfw: c.nsfw,
      slowmode: c.slowmode,
      categoryName: categories.find((cat) => cat.id === c.categoryId)?.name || null,
    })),
    roles: roles.map((r) => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      position: r.position,
      permissions: r.permissions.toString(),
    })),
  };
}

// POST /api/servers/:id/templates
templatesRouter.post('/servers/:id/templates', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new HttpError(404, 'Server not found.');
    if (server.ownerId !== req.user.id) {
      throw new HttpError(403, 'Only the server owner can save a template.');
    }

    const { name, description } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, 'Template name is required.');

    const data = await snapshotServer(serverId);

    const template = await prisma.serverTemplate.create({
      data: {
        name: sanitize(String(name)).slice(0, 100),
        description: description ? sanitize(String(description)).slice(0, 500) : null,
        ownerId: req.user.id,
        serverId,
        data,
      },
    });

    res.status(201).json({ template: mapTemplate(template) });
  } catch (e) { next(e); }
});

// GET /api/templates — browse public templates (searchable + categorized)
templatesRouter.get('/templates', optionalAuth, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const where = {};
    if (search) where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    if (category) where.category = category;
    const templates = await prisma.serverTemplate.findMany({
      where,
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        server: { select: { name: true, icon: true } },
      },
      orderBy: { uses: 'desc' },
    });
    res.json({ templates: templates.map(mapTemplate) });
  } catch (e) { next(e); }
});

// GET /api/templates/mine — templates I created
templatesRouter.get('/templates/mine', requireAuth, async (req, res, next) => {
  try {
    const templates = await prisma.serverTemplate.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ templates: templates.map(mapTemplate) });
  } catch (e) { next(e); }
});

// POST /api/servers/from-template — create a new server from a template
templatesRouter.post('/servers/from-template', requireAuth, async (req, res, next) => {
  try {
    const { templateId, name, description, icon } = req.body || {};
    if (!templateId) throw new HttpError(400, 'templateId is required.');

    const template = await prisma.serverTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new HttpError(404, 'Template not found.');

    const name_ = sanitize(String(name || `${template.name} Server`)).slice(0, 100);
    const data = template.data || {};

    const server = await prisma.server.create({
      data: {
        name: name_,
        description: description ? sanitize(String(description)) : template.description,
        icon: icon || null,
        ownerId: req.user.id,
        members: { create: [{ userId: req.user.id, role: 'FOUNDER' }] },
      },
    });

    // Recreate categories, channels, and roles from the snapshot.
    const categoryByName = new Map();
    for (const cat of data.categories || []) {
      const created = await prisma.category.create({
        data: { name: cat.name, position: cat.position || 0, serverId: server.id },
      });
      categoryByName.set(cat.name, created.id);
    }

    for (const ch of data.channels || []) {
      await prisma.channel.create({
        data: {
          id: newChannelId(),
          name: ch.name.toLowerCase().replace(/\s+/g, '-'),
          type: ch.type || 'TEXT',
          topic: ch.topic || '',
          position: ch.position || 0,
          nsfw: !!ch.nsfw,
          slowmode: ch.slowmode || 0,
          serverId: server.id,
          categoryId: ch.categoryName ? categoryByName.get(ch.categoryName) || null : null,
        },
      });
    }

    for (const r of data.roles || []) {
      await prisma.serverRole.create({
        data: {
          serverId: server.id,
          name: r.name,
          color: r.color || '#5865f2',
          hoist: !!r.hoist,
          mentionable: !!r.mentionable,
          position: r.position || 0,
          permissions: String(r.permissions || '0'),
        },
      });
    }

    await prisma.serverTemplate.update({
      where: { id: template.id },
      data: { uses: { increment: 1 } },
    });

    const created = await prisma.server.findUnique({
      where: { id: server.id },
      include: { channels: true, members: { include: { user: true } } },
    });

    res.status(201).json({ server: created });
  } catch (e) { next(e); }
});

// DELETE /api/templates/:id
templatesRouter.delete('/templates/:id', requireAuth, async (req, res, next) => {
  try {
    const template = await prisma.serverTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) throw new HttpError(404, 'Template not found.');
    if (template.ownerId !== req.user.id) {
      throw new HttpError(403, 'You can only delete your own templates.');
    }
    await prisma.serverTemplate.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

function mapTemplate(t) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    uses: t.uses,
    creator: t.creator ? { id: t.creator.id, username: t.creator.username, displayName: t.creator.displayName, avatarUrl: t.creator.avatarUrl } : undefined,
    server: t.server ? { name: t.server.name, icon: t.server.icon } : undefined,
    channelCount: t.data?.channels?.length || 0,
    roleCount: t.data?.roles?.length || 0,
    createdAt: t.createdAt.toISOString(),
  };
}
