// Shape mappers: convert DB rows into the exact JSON the frontend expects.
//
// The frontend (App.tsx) defines these contracts, and we must NOT change them
// or the UI breaks. Keeping the mapping in one place means every endpoint
// returns consistent shapes.
//
// Message   { id, channelId, author, role, color, body, createdAt, reactions }
// Channel   { id, name, topic }
// Member    { name, status, role }

const ROLE_TO_DISPLAY = {
  FOUNDER: 'Founder',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

const STATUS_TO_DISPLAY = {
  ONLINE: 'online',
  IDLE: 'idle',
  DND: 'dnd',
  OFFLINE: 'offline',
};

// Aggregate a message's reactions into { emoji: count }.
// Reactions are stored one-row-per-(user,emoji); counts come from grouping.
function reactionsToMap(reactions = []) {
  const map = {};
  for (const r of reactions) {
    map[r.emoji] = (map[r.emoji] || 0) + 1;
  }
  return map;
}

export function mapMessage(message) {
  if (!message) return null;
  // Authed messages have a related User; anonymous guest messages fall back
  // to the authorOverride string (e.g. the demo "You" guest).
  const author = message.author;
  return {
    id: message.id,
    channelId: message.channelId,
    author: author?.displayName ?? message.authorOverride ?? 'Guest',
    role: ROLE_TO_DISPLAY[author?.role] ?? 'Member',
    color: author?.color ?? '#5865f2',
    avatarUrl: author?.avatarUrl ?? null,
    body: message.body,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: message.createdAt.toISOString(),
    reactions: reactionsToMap(message.reactions),
  };
}

export function mapChannel(channel) {
  return {
    id: channel.id,
    name: channel.name,
    topic: channel.topic ?? '',
    type: channel.type ?? 'TEXT',
  };
}

export function mapMember(user) {
  return {
    name: user.displayName,
    status: STATUS_TO_DISPLAY[user.status] ?? 'offline',
    role: ROLE_TO_DISPLAY[user.role] ?? 'Member',
    avatarUrl: user.avatarUrl ?? null,
  };
}

export { ROLE_TO_DISPLAY, STATUS_TO_DISPLAY };
