// Auto-moderation enforcement — runs on the message-send path (HTTP + socket).
// Loads a server's AutomodConfig, checks the message against the enabled
// filters (words / links / spam), and on a violation issues an auto-strike
// (auto-timing-out the member once they hit maxStrikes) and blocks the message.
import { prisma } from '../lib/prisma.js';

// Default blocked-word list. Kept here (not in the route) so the route can
// import the cache-invalidator from this module without a circular import.
export const BAD_WORDS = ['spam', 'scam', 'hate', 'violence', 'abuse'];

// Lightweight "AI-style" heuristic layer: profanity + known-bad link domains.
// This is the on-prem replacement for a hosted ML classifier — it catches the
// obvious patterns without an external API. Gated by config flags.
export const PROFANITY = ['damn', 'shit', 'fuck', 'bitch', 'ass', 'crap'];
export const KNOWN_BAD_DOMAINS = ['bit.ly.scam', 'free-nitro', 'discord-nitro', 'steam-gift', 'airdrop-token'];

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s.]+\.[^\s]+)/i;
const SPAM_WINDOW_MS = 10_000; // 10s sliding window
const SPAM_MAX = 5;            // > 5 messages in the window = spam

// Lightweight in-memory config cache (per server) to avoid a DB hit per message.
const configCache = new Map(); // serverId -> { value, expires }
const CONFIG_TTL_MS = 30_000;

// Per-user recent send timestamps for spam detection (in-memory, best-effort).
const recentSends = new Map(); // userId -> number[]

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getConfig(serverId) {
  const cached = configCache.get(serverId);
  if (cached && cached.expires > Date.now()) return cached.value;
  let value = null;
  try {
    value = await prisma.automodConfig.findUnique({ where: { serverId } });
  } catch {
    value = null;
  }
  configCache.set(serverId, { value, expires: Date.now() + CONFIG_TTL_MS });
  return value;
}

// Call after changing config so enforcement picks it up immediately.
export function invalidateAutomodCache(serverId) {
  configCache.delete(serverId);
}

/**
 * @returns {Promise<{ blocked: boolean, reason?: string, timedOut?: boolean, strikeCount?: number }>}
 */
export async function runAutomod({ serverId, userId, content }) {
  if (!serverId || !userId || !content) return { blocked: false };

  const config = await getConfig(serverId);
  if (!config) return { blocked: false };

  // Server owners/admins are exempt from auto-mod.
  try {
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (member && ['FOUNDER', 'ADMIN'].includes(member.role)) return { blocked: false };
  } catch { /* fall through — treat as normal member */ }

  const text = String(content);

  if (config.filterWords) {
    const hit = BAD_WORDS.find((w) => new RegExp(`\\b${escapeRe(w)}\\b`, 'i').test(text));
    if (hit) return violation({ serverId, userId, config, reason: `blocked word: "${hit}"` });
  }

  if (config.filterLinks && URL_RE.test(text)) {
    const domain = (text.match(URL_RE)?.[0] || '').toLowerCase();
    if (KNOWN_BAD_DOMAINS.some((d) => domain.includes(d))) {
      return violation({ serverId, userId, config, reason: 'link to a known scam domain' });
    }
    return violation({ serverId, userId, config, reason: 'links are not allowed here' });
  }

  if (config.filterProfanity) {
    const hit = PROFANITY.find((w) => new RegExp(`\\b${escapeRe(w)}\\b`, 'i').test(text));
    if (hit) return violation({ serverId, userId, config, reason: `prohibited language: "${hit}"` });
  }

  if (config.filterSpam) {
    const now = Date.now();
    const arr = (recentSends.get(userId) || []).filter((t) => now - t < SPAM_WINDOW_MS);
    arr.push(now);
    recentSends.set(userId, arr);
    if (arr.length > SPAM_MAX) {
      return violation({ serverId, userId, config, reason: 'spam detected — slow down' });
    }
  }

  return { blocked: false };
}

async function violation({ serverId, userId, config, reason }) {
  try {
    await prisma.strike.create({
      data: {
        serverId,
        userId,
        issuedBy: 'automod',
        reason: `Automod: ${reason}`,
        auto: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const strikeCount = await prisma.strike.count({
      where: { serverId, userId, active: true, expiresAt: { gt: new Date() } },
    });

    let timedOut = false;
    if (strikeCount >= (config.maxStrikes ?? 3)) {
      await prisma.serverMember.update({
        where: { serverId_userId: { serverId, userId } },
        data: { mutedUntil: new Date(Date.now() + (config.strikeTimeout ?? 1440) * 60 * 1000) },
      }).catch(() => {});
      timedOut = true;
    }

    await prisma.auditLog.create({
      data: { serverId, userId, action: 'AUTOMOD_BLOCK', targetId: userId, details: { reason, strikeCount } },
    }).catch(() => {});

    return { blocked: true, reason, timedOut, strikeCount };
  } catch {
    // Even if strike bookkeeping fails, still block the offending message.
    return { blocked: true, reason };
  }
}
