// Server invite links.
//   POST   /api/servers/:id/invites      → create a new invite code
//   GET    /api/invites/:code            → resolve an invite to its server info
//   POST   /api/invites/:code/join       → join the server behind an invite
//   DELETE /api/invites/:code            → revoke an invite (creator/owner only)
//   GET    /api/servers/:id/invites      → list a server's active invites
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import crypto from 'node:crypto';

export const inviteRouter = Router();

// Cryptographically-adequate short code. 6 chars of [A-Za-z0-9] gives ~57
// bits of entropy, enough that brute-forcing codes is impractical.
function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const EXPIRY_MS = {
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '6hours': 6 * 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
  '7days': 7 * 24 * 60 * 60 * 1000,
  'never': 0,
};

const MAX_USES_OPTIONS = new Set([0, 1, 5, 10, 25, 50, 100]);

inviteRouter.post('/servers/:id/invites', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new HttpError(404, 'Server not found.');

    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member) throw new HttpError(403, 'You must be a member to create invites.');

    const expiryKey = EXPIRY_MS[String(req.body?.expiresIn)] ? String(req.body?.expiresIn) : '7days';
    const maxUses = MAX_USES_OPTIONS.has(Number(req.body?.maxUses)) ? Number(req.body?.maxUses) : 0;

    const invite = await prisma.invite.create({
      data: {
        code: makeCode(),
        serverId,
        creatorId: req.user.id,
        maxUses,
        uses: 0,
        expiresAt: expiryKey === 'never' ? null : new Date(Date.now() + EXPIRY_MS[expiryKey]),
      },
    });

    res.status(201).json({ invite });
  } catch (e) { next(e); }
});

inviteRouter.get('/servers/:id/invites', requireAuth, async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.user.id } },
    });
    if (!member || !['FOUNDER', 'ADMIN'].includes(member.role)) {
      throw new HttpError(403, 'Only admins may view invites.');
    }
    const invites = await prisma.invite.findMany({
      where: { serverId },
      include: { creator: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ invites });
  } catch (e) { next(e); }
});

inviteRouter.get('/invites/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code);
    const invite = await prisma.invite.findUnique({
      where: { code },
      include: {
        server: {
          include: {
            channels: true,
            _count: { select: { members: true } },
          },
        },
      },
    });
    if (!invite) throw new HttpError(404, 'Invite not found or has been revoked.');
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new HttpError(410, 'This invite has expired.');
    }
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      throw new HttpError(410, 'This invite has reached its maximum uses.');
    }
    res.json({
      code: invite.code,
      server: {
        id: invite.server.id,
        name: invite.server.name,
        description: invite.server.description,
        icon: invite.server.icon,
        banner: invite.server.banner,
        memberCount: invite.server._count.members,
      },
    });
  } catch (e) { next(e); }
});

inviteRouter.post('/invites/:code/join', requireAuth, async (req, res, next) => {
  try {
    const code = String(req.params.code);
    const invite = await prisma.invite.findUnique({ where: { code } });
    if (!invite) throw new HttpError(404, 'Invite not found.');
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new HttpError(410, 'This invite has expired.');
    }
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      throw new HttpError(410, 'This invite is full.');
    }

    // Check if user is banned from this server
    const ban = await prisma.serverBan.findUnique({
      where: { serverId_userId: { serverId: invite.serverId, userId: req.user.id } },
    });
    if (ban) {
      if (ban.expiresAt && ban.expiresAt > new Date()) {
        throw new HttpError(403, 'You are banned from this server.');
      }
      if (ban.expiresAt && ban.expiresAt <= new Date()) {
        await prisma.serverBan.delete({ where: { id: ban.id } });
      } else {
        throw new HttpError(403, 'You are banned from this server.');
      }
    }

    // Idempotent join: if already a member, just return the server.
    const existing = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: invite.serverId, userId: req.user.id } },
    });
    if (existing) {
      const server = await prisma.server.findUnique({
        where: { id: invite.serverId },
        include: { channels: true, members: { include: { user: true } } },
      });
      return res.json({ server, alreadyMember: true });
    }

    await prisma.$transaction([
      prisma.serverMember.create({
        data: { serverId: invite.serverId, userId: req.user.id, role: 'MEMBER' },
      }),
      prisma.invite.update({ where: { code }, data: { uses: { increment: 1 } } }),
    ]);

    const server = await prisma.server.findUnique({
      where: { id: invite.serverId },
      include: { channels: true, members: { include: { user: true } } },
    });
    res.status(201).json({ server, alreadyMember: false });
  } catch (e) { next(e); }
});

inviteRouter.delete('/invites/:code', requireAuth, async (req, res, next) => {
  try {
    const code = String(req.params.code);
    const invite = await prisma.invite.findUnique({ where: { code } });
    if (!invite) throw new HttpError(404, 'Invite not found.');

    // Only the creator or a server admin/owner may revoke.
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: invite.serverId, userId: req.user.id } },
    });
    const canRevoke =
      invite.creatorId === req.user.id ||
      (member && ['FOUNDER', 'ADMIN'].includes(member.role));
    if (!canRevoke) throw new HttpError(403, 'You may not revoke this invite.');

    await prisma.invite.delete({ where: { code } });
    res.json({ revoked: true });
  } catch (e) { next(e); }
});
