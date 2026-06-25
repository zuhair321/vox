// Chat business logic: building app state, posting messages, reactions.
//
// These functions stay contract-agnostic — they return Prisma rows with the
// relations needed by the mappers. The route layer does the mapping to the
// frontend shapes (see src/lib/mappers.js).
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

const MESSAGE_INCLUDE = {
  author: true,
  reactions: true,
};

// The full app state the frontend hydrates from (GET /api/state + socket init).
// `nitroClaimed` is a demo flag kept in-memory; everything else comes from the DB.
let nitroClaimed = false;
let databaseAvailable = true;

const fallbackChannels = [
  { id: 'welcome', name: 'welcome', topic: 'Arrival chamber for new voices', type: 'TEXT', position: 0 },
  { id: 'general', name: 'general', topic: 'The main signal through the void', type: 'TEXT', position: 1 },
  { id: 'ship-room', name: 'ship-room', topic: 'Build notes and release checks', type: 'TEXT', position: 2 },
  { id: 'voice-lobby', name: 'voice-lobby', topic: 'Summon the voice stage', type: 'VOICE', position: 3 },
];

const fallbackMembers = [
  { id: 'mira', displayName: 'Mira', role: 'FOUNDER', color: '#ffd700', status: 'ONLINE' },
  { id: 'zed', displayName: 'Zed', role: 'MODERATOR', color: '#4a0080', status: 'ONLINE' },
  { id: 'nova', displayName: 'Nova', role: 'MEMBER', color: '#6600cc', status: 'IDLE' },
  { id: 'kai', displayName: 'Kai', role: 'ADMIN', color: '#ff3366', status: 'DND' },
];

let fallbackMessages = [
  {
    id: 'local-1',
    channelId: 'welcome',
    author: fallbackMembers[0],
    authorOverride: null,
    body: 'Welcome to VOX. The command center is awake.',
    createdAt: new Date(Date.now() - 1000 * 60 * 20),
    reactions: [{ emoji: 'pulse' }, { emoji: 'pulse' }, { emoji: 'pulse' }, { emoji: 'void' }, { emoji: 'void' }],
  },
  {
    id: 'local-2',
    channelId: 'general',
    author: fallbackMembers[1],
    authorOverride: null,
    body: 'Try sending a message, switching channels, or opening the member matrix.',
    createdAt: new Date(Date.now() - 1000 * 60 * 9),
    reactions: [{ emoji: 'boost' }, { emoji: 'boost' }, { emoji: 'boost' }, { emoji: 'boost' }],
  },
  {
    id: 'local-3',
    channelId: 'ship-room',
    author: fallbackMembers[2],
    authorOverride: null,
    body: 'Backend heartbeat is wired in. If MySQL is offline, VOX keeps a local echo.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    reactions: [{ emoji: 'check' }, { emoji: 'check' }, { emoji: 'check' }, { emoji: 'check' }, { emoji: 'check' }],
  },
];

function useFallback(error) {
  if (databaseAvailable) {
    console.warn('[vox] database unavailable; using in-memory demo state:', error.message);
  }
  databaseAvailable = false;
}

function createFallbackMessage({ channelId, author, body, user, attachments }) {
  const channel = fallbackChannels.find((item) => item.id === channelId);
  if (!channel) throw new HttpError(404, 'Channel not found.');

  const message = {
    id: `local-${Date.now()}`,
    channelId: channel.id,
    author: user
      ? {
          id: user.id,
          displayName: user.displayName ?? user.username ?? 'You',
          role: user.role ?? 'MEMBER',
          color: user.color ?? '#5865f2',
        }
      : null,
    authorOverride: String(author || 'You').slice(0, 32),
    body: String(body || '').trim().slice(0, 2000),
    attachments: Array.isArray(attachments) ? attachments : [],
    createdAt: new Date(),
    reactions: [],
  };
  fallbackMessages = [...fallbackMessages, message].slice(-200);
  return message;
}

export async function getChannels() {
  if (!databaseAvailable) return fallbackChannels;
  return prisma.channel.findMany({ orderBy: { position: 'asc' } });
}

export async function getMessages(limit = 100) {
  if (!databaseAvailable) return fallbackMessages.slice(-limit);
  return prisma.message.findMany({
    take: limit,
    orderBy: { createdAt: 'asc' },
    include: MESSAGE_INCLUDE,
  });
}

export async function getOnlineMembers() {
  if (!databaseAvailable) return fallbackMembers;
  // Phase 1: anyone who is not OFFLINE is shown as "online" in the member list.
  return prisma.user.findMany({
    where: { status: { not: 'OFFLINE' } },
    orderBy: [{ status: 'asc' }, { displayName: 'asc' }],
  });
}

export async function getState() {
  // Three cheap queries; fine for Phase 1 scale.
  let channels;
  let messages;
  let members;

  try {
    [channels, messages, members] = await Promise.all([
      getChannels(),
      getMessages(),
      getOnlineMembers(),
    ]);
  } catch (error) {
    useFallback(error);
    channels = fallbackChannels;
    messages = fallbackMessages;
    members = fallbackMembers;
  }

  return { channels, messages, members, nitroClaimed };
}

export function isNitroClaimed() {
  return nitroClaimed;
}

export function claimNitro() {
  nitroClaimed = true;
  return {
    claimed: true,
    perks: ['HD streaming', 'animated profile', 'server boosts', 'custom themes'],
  };
}

// Create a message. `actor` is the authed user (or null for a guest).
export async function createMessage({ channelId, author, body, user, attachments }) {
  const text = String(body || '').trim();
  const atts = Array.isArray(attachments) ? attachments : [];
  if (!text && atts.length === 0) throw new HttpError(400, 'Message body or attachment is required.');

  if (!databaseAvailable) {
    return createFallbackMessage({ channelId, author, body: text, user, attachments: atts });
  }

  try {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new HttpError(404, 'Channel not found.');

    const data = {
      channelId: channel.id,
      body: text.slice(0, 2000),
      attachments: atts.length ? atts : undefined,
    };

    if (user) {
      // Authed: link to the real user.
      data.userId = user.id;
    } else {
      // Anonymous guest (the old demo "You" flow): store a display name.
      data.authorOverride = String(author || 'Guest').slice(0, 32);
    }

    const message = await prisma.message.create({ data, include: MESSAGE_INCLUDE });
    return message;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    useFallback(error);
    return createFallbackMessage({ channelId, author, body: text, user, attachments: atts });
  }
}
