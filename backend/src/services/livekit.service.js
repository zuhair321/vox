// LiveKit SFU service (roadmap Month 1: voice media path).
//
// Generates LiveKit access JWTs so clients can join a room directly.
// The existing mesh signaling path is untouched; when Channel.rtcMode = 'SFU'
// and VOX_SFU_URL is set, the voice:join handler hands the client a token
// and lets LiveKit carry the media.
import jwt from 'jsonwebtoken';

const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

function extractHost(wsOrHttpUrl) {
  if (!wsOrHttpUrl) return '';
  const trimmed = wsOrHttpUrl.replace(/^wss?:\/\//, 'https://').replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    return url.host;
  } catch {
    return trimmed;
  }
}

const LIVEKIT_HOST = extractHost(LIVEKIT_URL);

function buildToken({ roomName, identity, metadata = '', ttlSec = 3600 }) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_HOST) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + ttlSec,
    iss: LIVEKIT_API_KEY,
    nbf: now,
  };

  const videoGrant = {
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  };

  const claims = {
    ...payload,
    video: videoGrant,
    jti: `${identity}-${Date.now()}`,
  };

  if (metadata) claims.metadata = metadata;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: LIVEKIT_API_KEY,
  };

  return {
    token: jwt.sign(claims, LIVEKIT_API_SECRET, { header }),
    url: `https://${LIVEKIT_HOST}`,
    room: roomName,
  };
}

export function generateLiveKitToken({ channelId, userId, username }) {
  const roomName = `vox-channel-${channelId}`;
  return buildToken({
    roomName,
    identity: String(userId),
    metadata: JSON.stringify({ username }),
    ttlSec: 7200,
  });
}

export function isLiveKitConfigured() {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

export { LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET };
