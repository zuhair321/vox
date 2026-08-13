// Web Push delivery (RFC 8030).
// Lazy-loads the `web-push` library only when VAPID keys exist, so users
// who never enable push notifications never pay the import cost.
import crypto from 'node:crypto';

let webpushModule = null;
let vapidKeysCache = null;
let vapidFetchedAt = 0;
const VAPID_TTL_MS = 60_000;

async function loadWebPush() {
  if (webpushModule) return webpushModule;
  try {
    webpushModule = await import('web-push');
    return webpushModule;
  } catch (err) {
    console.warn('[pushDelivery] web-push not installed (' + (err && err.message) + '). Skipping push delivery.');
    return null;
  }
}

async function getVapidKeys() {
  const now = Date.now();
  if (vapidKeysCache && now - vapidFetchedAt < VAPID_TTL_MS) return vapidKeysCache;
  const { prisma } = await import('../lib/prisma.js');
  let cfg = await prisma.appConfig.findUnique({ where: { id: 'singleton' } });
  if (!cfg || (!cfg.vapidPublic || !cfg.vapidPrivate)) {
    // Generate fresh keypair and persist
    const wp = await loadWebPush();
    if (!wp) return null;
    const { publicKey, privateKey } = wp.generateVAPIDKeys();
    cfg = await prisma.appConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        vapidPublic: publicKey,
        vapidPrivate: privateKey,
        vapidSubject: process.env.VAPID_SUBJECT || 'mailto:[email protected]',
      },
      update: { vapidPublic: publicKey, vapidPrivate: privateKey },
    });
  }
  vapidKeysCache = cfg;
  vapidFetchedAt = now;
  return cfg;
}

export async function sendPushToUser(userId, payload) {
  try {
    const wp = await loadWebPush();
    if (!wp) return { delivered: 0, skipped: 'no web-push module' };
    const vapid = await getVapidKeys();
    if (!vapid) return { delivered: 0, skipped: 'no VAPID keys' };

    wp.setVapidDetails(vapid.vapidSubject || 'mailto:[email protected]', vapid.vapidPublic, vapid.vapidPrivate);

    const { prisma } = await import('../lib/prisma.js');
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    const body = JSON.stringify(payload);
    let delivered = 0;
    for (const sub of subs) {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 24 * 60 * 60 }
        );
        delivered++;
      } catch (err) {
        // 404/410 = subscription is dead; remove it.
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {});
        } else {
          console.warn('[pushDelivery] failed for endpoint', sub.endpoint.slice(0, 32), err && err.message);
        }
      }
    }
    return { delivered, total: subs.length };
  } catch (err) {
    console.warn('[pushDelivery] outer error:', err && err.message);
    return { delivered: 0, error: err && err.message };
  }
}

// Resolve each recipient's effective notification level for a channel.
// Returns true if a push should be sent (true = YES, false = NO).
export async function shouldNotify(userId, ctx) {
  const { channelId, serverId, mentionedType, mentionedUserIds } = ctx;
  const { prisma } = await import('../lib/prisma.js');

  // Channel explicit override wins.
  const ch = await prisma.notificationSettings.findFirst({
    where: { userId, channelId, serverId: null },
  });
  const channelLevel = (ch && ch.level) || 'DEFAULT';

  // Then server preference (channelId null + serverId set).
  const sv = await prisma.notificationSettings.findFirst({
    where: { userId, serverId, channelId: null },
  });
  const serverLevel = (sv && sv.level) || 'DEFAULT';

  const effective = channelLevel !== 'DEFAULT' ? channelLevel
                 : serverLevel !== 'DEFAULT' ? serverLevel
                 : 'MENTIONS'; // sensible default

  if (effective === 'ALL') return true;
  if (effective === 'NOTHING') return false;
  // MENTIONS: only when the user is mentioned directly, @role'd, or @here.
  if (mentionedUserIds && mentionedUserIds.includes(userId)) return true;
  if (mentionedType && (mentionedType === 'here' || mentionedType === 'channel')) return true;
  if (mentionedType && mentionedType.startsWith('role:')) {
    // serverMember role check
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (member && mentionedType === ('role:' + member.role)) return true;
  }
  return false;
}
