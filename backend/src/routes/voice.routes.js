// Voice / SFU (LiveKit) endpoints.
//
//   GET /api/voice/config          → { sfuEnabled, provider }
//   GET /api/voice/livekit-token?channelId=xxx → { token, url, room }
//
// The token endpoint reuses the existing LiveKit service (services/livekit.service.js)
// which signs an HS256 access JWT scoped to a single room
// (`vox-channel-<channelId>`). When LIVEKIT_URL / LIVEKIT_API_KEY /
// LIVEKIT_API_SECRET are unset, `sfuEnabled` is false and the client keeps
// using the mesh (Socket.io + RTCPeerConnection) path — no behaviour change.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import {
  generateLiveKitToken,
  isLiveKitConfigured,
} from '../services/livekit.service.js';

export const voiceRouter = Router();

// Public-ish config so the client can decide mesh vs SFU before joining.
voiceRouter.get('/voice/config', requireAuth, async (_req, res) => {
  res.json({
    sfuEnabled: isLiveKitConfigured(),
    provider: isLiveKitConfigured() ? 'LIVEKIT' : 'MESH',
  });
});

// Issue a LiveKit join token for a voice channel.
voiceRouter.get('/voice/livekit-token', requireAuth, async (req, res, next) => {
  try {
    if (!isLiveKitConfigured()) {
      throw new HttpError(503, 'SFU (LiveKit) is not configured on this server.');
    }
    const channelId = String(req.query.channelId || '');
    if (!channelId) throw new HttpError(400, 'channelId is required.');

    // Verify the channel exists and is a voice/stage channel so a token can't be
    // minted for an arbitrary room name.
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, type: true, serverId: true },
    });
    if (!channel) throw new HttpError(404, 'Channel not found.');
    if (channel.type !== 'VOICE' && channel.type !== 'STAGE') {
      throw new HttpError(400, 'LiveKit tokens are only issued for voice/stage channels.');
    }

    const result = generateLiveKitToken({
      channelId,
      userId: req.user.id,
      username: req.user.username || req.user.id,
    });
    if (!result) throw new HttpError(500, 'Failed to generate LiveKit token.');

    res.json(result);
  } catch (e) { next(e); }
});
