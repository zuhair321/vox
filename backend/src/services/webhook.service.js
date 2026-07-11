// Webhook delivery service — sends message payloads to registered outbound URLs.
// Runs asynchronously so it never blocks the HTTP response path.
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

const DELIVERY_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

async function resolveAuthorAvatar(author, serverId) {
  if (!author?.avatarUrl) return null;
  // Resolve relative URLs to absolute
  if (author.avatarUrl.startsWith('http')) return author.avatarUrl;
  return `${env.apiBase}${author.avatarUrl}`;
}

export async function deliverWebhooks(channelId, message) {
  if (!channelId || !message) return;

  // Find all webhooks for this channel that have an outgoing URL
  const webhooks = await prisma.webhook.findMany({
    where: { channelId, url: { not: null } },
  });

  if (!webhooks.length) return;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { server: true },
  });

  const payload = {
    id: message.id,
    content: message.body,
    timestamp: message.createdAt,
    edited: message.edited || false,
    author: {
      id: message.author?.id || null,
      username: message.author?.username || message.authorOverride || 'Webhook',
      avatar: message.author?.avatarUrl
        ? (message.author.avatarUrl.startsWith('http')
          ? message.author.avatarUrl
          : `${env.apiBase}${message.author.avatarUrl}`)
        : null,
    },
    guild: channel?.server ? {
      id: channel.server.id,
      name: channel.server.name,
    } : null,
    channel: {
      id: channelId,
      name: channel?.name || 'unknown',
    },
    attachments: (message.attachments || []).map(a => ({
      url: a.url.startsWith('http') ? a.url : `${env.apiBase}${a.url}`,
      name: a.name,
      size: a.size,
      kind: a.kind,
    })),
    reactions: (message.reactions || []).map(r => ({
      emoji: r.emoji,
      count: 1,
      me: false,
    })),
    type: 'message',
  };

  // Fire all deliveries in parallel — don't await
  webhooks.forEach(webhook => {
    deliverToUrl(webhook, payload).catch(err => {
      console.error(`[webhook] delivery failed for webhook ${webhook.id}:`, err?.message);
    });
  });
}

async function deliverToUrl(webhook, payload) {
  const url = webhook.url;
  if (!url) return;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Vox-Webhook/1.0',
          'X-Webhook-Token': webhook.token,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return; // success

      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      if (isLast) {
        console.error(`[webhook] final delivery failure for ${webhook.id} → ${url}:`, err.message);
      } else {
        // Exponential backoff: 1s, 2s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
}
