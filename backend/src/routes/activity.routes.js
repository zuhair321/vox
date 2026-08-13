// Activity status (rich presence): Playing / Listening / Watching / Streaming.
//   PATCH /api/users/me/activity → set/clear current activity (broadcast via socket)
//   GET   /api/users/:id/activity → read a user's activity
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';
import { getIO } from '../sockets/index.js';

export const activityRouter = Router();

const VALID_TYPES = ['PLAYING', 'LISTENING', 'WATCHING', 'STREAMING'];

// Catalog of common games for the "Playing a game" picker (rich presence).
const GAME_CATALOG = [
  'Valorant', 'League of Legends', 'Minecraft', 'Fortnite', 'Apex Legends',
  'Counter-Strike 2', 'Overwatch 2', 'Elden Ring', 'Cyberpunk 2077', 'Genshin Impact',
  'Call of Duty', 'Destiny 2', 'Rocket League', 'Among Us', 'Stardew Valley',
  'The Witcher 3', 'Hollow Knight', 'Dead by Daylight', 'Battlefield', 'Helldivers 2',
];

// GET /api/activity/games — popular-game catalog for the activity picker.
activityRouter.get('/activity/games', requireAuth, async (req, res) => {
  res.json({ games: GAME_CATALOG });
});

// GET /api/activity/spotify/now-playing — current Spotify track (rich presence
// listen-along). Requires a connected SPOTIFY integration with a valid token
// (env-gated: SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET). Returns null if not
// configured so the client can gracefully skip it.
activityRouter.get('/activity/spotify/now-playing', requireAuth, async (req, res) => {
  try {
    const integration = await prisma.integration.findFirst({
      where: { userId: req.user.id, type: 'SPOTIFY', enabled: true },
    });
    const token = integration?.config?.accessToken;
    if (!token || !process.env.SPOTIFY_CLIENT_ID) {
      return res.json({ playing: null });
    }
    const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.json({ playing: null });
    const body = await r.json().catch(() => null);
    if (!body?.item) return res.json({ playing: null });
    const track = body.item;
    const playing = {
      name: track.name,
      artist: track.artists?.map((a) => a.name).join(', '),
      album: track.album?.name,
      image: track.album?.images?.[0]?.url || null,
      url: track.external_urls?.spotify || null,
    };
    // Reflect into the user's LISTENING activity.
    await prisma.user.update({
      where: { id: req.user.id },
      data: { activityData: { type: 'LISTENING', name: `${playing.name} — ${playing.artist}`, url: playing.url, largeImage: playing.image } },
    }).catch(() => {});
    res.json({ playing });
  } catch {
    res.json({ playing: null });
  }
});

// PATCH /api/users/me/activity
activityRouter.patch('/users/me/activity', requireAuth, async (req, res, next) => {
  try {
    const { type, name, url, details, state, largeImage } = req.body || {};
    let data = null;

    if (type || name) {
      if (type && !VALID_TYPES.includes(type)) throw new HttpError(400, 'Invalid activity type.');
      if (!name || !String(name).trim()) throw new HttpError(400, 'Activity name is required.');
      data = {
        type: type || 'PLAYING',
        name: sanitize(String(name)).slice(0, 128),
        url: url ? String(url).slice(0, 512) : null,
        details: details ? sanitize(String(details)).slice(0, 128) : null,
        state: state ? sanitize(String(state)).slice(0, 128) : null,
        largeImage: largeImage ? (() => {
          const trimmed = String(largeImage).trim();
          if (!/^https?:\/\//i.test(trimmed)) return null;
          return trimmed.slice(0, 512);
        })() : null,
      };
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { activityData: data },
    });

    const io = getIO();
    if (io) io.emit('user:activity', { userId: req.user.id, activity: updated.activityData });

    res.json({ activity: updated.activityData });
  } catch (e) { next(e); }
});

// GET /api/users/:id/activity
activityRouter.get('/users/:id/activity', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, activityData: true },
    });
    if (!user) throw new HttpError(404, 'User not found.');
    res.json({ activity: user.activityData });
  } catch (e) { next(e); }
});
