import { prisma } from '../lib/prisma.js';

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s.]+\.[^\s]+)/i;
const SPAM_WINDOW_MS = 10_000;
const SPAM_MAX = 5;

const recentSends = new Map();

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectSpam(userId, channelId, config) {
  const now = Date.now();
  const arr = (recentSends.get(userId) || []).filter((t) => now - t < SPAM_WINDOW_MS);
  arr.push(now);
  recentSends.set(userId, arr);
  return arr.length > (config?.maxDuplicates || SPAM_MAX);
}

export function detectMentionSpam(content, config) {
  const mentions = (content.match(/<@!?(\d+)>/g) || []).length;
  const roleMentions = (content.match(/<@&(\d+)>/g) || []).length;
  const everyoneMentions = (content.match(/@(everyone|here)/g) || []).length;
  return (
    mentions > (config?.maxMentions || 5) ||
    roleMentions > (config?.maxRoleMentions || 3) ||
    everyoneMentions > (config?.maxEveryoneMentions || 1)
  );
}

export function detectKeywords(content, config) {
  const text = config?.caseSensitive ? content : content.toLowerCase();
  const keywords = (config?.keywords || []).map((k) => (config?.caseSensitive ? k : k.toLowerCase()));
  const matched = [];

  for (const keyword of keywords) {
    let found = false;
    switch (config?.matchMode || 'contains') {
      case 'exact':
        found = text === keyword;
        break;
      case 'contains':
        found = text.includes(keyword);
        break;
      case 'word':
        found = new RegExp(`\\b${escapeRe(keyword)}\\b`, config?.caseSensitive ? '' : 'i').test(text);
        break;
      case 'regex':
        found = new RegExp(keyword, config?.caseSensitive ? '' : 'i').test(text);
        break;
    }
    if (found) matched.push(keyword);
  }

  return { triggered: matched.length > 0, matched };
}

export function detectInviteLinks(content) {
  const patterns = [
    /discord\.gg\/[a-zA-Z0-9-]+/i,
    /discord\.com\/invite\/[a-zA-Z0-9-]+/i,
    /discordapp\.com\/invite\/[a-zA-Z0-9-]+/i,
    /(?:https?:\/\/)?(?:www\.)?(?:telegram|t\.me)\/[a-zA-Z0-9_]+/i,
    /(?:https?:\/\/)?(?:www\.)?(?:whatsapp|wa\.me)\/[a-zA-Z0-9]+/i,
  ];
  return patterns.some((p) => p.test(content));
}

export function detectExcessiveCaps(content, config) {
  if (content.length < (config?.minLength || 10)) return false;
  const capsCount = (content.match(/[A-Z]/g) || []).length;
  return (capsCount / content.length) * 100 > (config?.threshold || 70);
}

export function detectEmojiSpam(content, config) {
  const emojiCount = (content.match(/<a?:\w+:\d+>/g) || []).length + (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  return emojiCount > (config?.maxEmojis || 10);
}

export function detectZalgo(content) {
  const zalgoCount = (content.match(/[\u0300-\u036F]/g) || []).length;
  return zalgoCount > 5;
}

export function detectRegex(content, config) {
  if (!config?.pattern) return false;
  try {
    return new RegExp(config.pattern, config?.flags || 'i').test(content);
  } catch {
    return false;
  }
}

export function detectLinks(content) {
  return URL_RE.test(content);
}

export function detectAttachmentSpam(content, config) {
  const urls = (content.match(URL_RE) || []).length;
  return urls > (config?.maxAttachments || 3);
}

export function detectNewlineSpam(content, config) {
  const lines = content.split('\n').length;
  return lines > (config?.maxNewlines || 20);
}
