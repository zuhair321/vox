// Voice regions.
//   GET /api/voice/regions       → list available voice regions
//   PUT /api/channels/:id/region → set a voice channel's region (admin/owner)
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkServerPermission } from '../middleware/permissions.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';

export const regionsRouter = Router();

// Static catalog of voice regions. "auto" routes to the lowest-latency region.
const REGIONS = [
  { id: 'auto', name: 'Automatic', flag: '🌐' },
  { id: 'us-east', name: 'US East', flag: '🇺🇸' },
  { id: 'us-west', name: 'US West', flag: '🇺🇸' },
  { id: 'us-central', name: 'US Central', flag: '🇺🇸' },
  { id: 'eu-west', name: 'Europe West', flag: '🇪🇺' },
  { id: 'eu-central', name: 'Europe Central', flag: '🇪🇺' },
  { id: 'singapore', name: 'Singapore', flag: '🇸🇬' },
  { id: 'japan', name: 'Japan', flag: '🇯🇵' },
  { id: 'brazil', name: 'Brazil', flag: '🇧🇷' },
  { id: 'sydney', name: 'Sydney', flag: '🇦🇺' },
  { id: 'south-africa', name: 'South Africa', flag: '🇿🇦' },
  { id: 'india', name: 'India', flag: '🇮🇳' },
];

// GET /api/voice/regions
regionsRouter.get('/voice/regions', requireAuth, async (req, res, next) => {
  try {
    res.json({ regions: REGIONS });
  } catch (e) { next(e); }
});

// PUT /api/channels/:id/region
regionsRouter.put('/channels/:id/region', requireAuth, async (req, res, next) => {
  try {
    const { region } = req.body || {};
    if (!region || !REGIONS.find((r) => r.id === region)) throw new HttpError(400, 'Invalid region.');

    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) throw new HttpError(404, 'Channel not found.');
    if (channel.type !== 'VOICE' && channel.type !== 'STAGE') {
      throw new HttpError(400, 'Region can only be set on voice or stage channels.');
    }
    if (!channel.serverId) throw new HttpError(400, 'Channel is not attached to a server.');

    const allowed = await checkServerPermission(req.user.id, channel.serverId, 'manageChannels');
    if (!allowed) throw new HttpError(403, 'Server admin access required.');

    const updated = await prisma.channel.update({
      where: { id: req.params.id },
      data: { region },
    });
    res.json({ region: updated.region });
  } catch (e) { next(e); }
});
