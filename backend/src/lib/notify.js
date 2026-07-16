// Best-effort notification delivery (env-gated). Today this covers email on
// @mentions; push delivery plugs in here once a VAPID/web-push setup exists.
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../services/email.service.js';

// Extract @username mentions from a message body.
export function extractMentions(text) {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_.]+)/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

// Notify mentioned users by email (respecting mutes). Best-effort: any failure
// is swallowed so message delivery is never blocked.
export async function notifyMentions({ content, authorName, channelId, serverId }) {
  try {
    const names = extractMentions(content);
    if (names.length === 0) return;

    const users = await prisma.user.findMany({
      where: { username: { in: names }, emailVerified: true },
      select: { id: true, email: true, username: true },
    });
    if (users.length === 0) return;

    // Drop anyone who muted this server/channel.
    const mutes = await prisma.notificationSettings.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        muted: true,
        OR: [
          { serverId: serverId || undefined },
          { channelId: channelId || undefined },
        ],
      },
      select: { userId: true },
    });
    const mutedIds = new Set(mutes.map((m) => m.userId));

    for (const u of users) {
      if (mutedIds.has(u.id)) continue;
      try {
        await sendEmail({
          to: u.email,
          subject: `VOX — ${authorName || 'Someone'} mentioned you`,
          html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;color:#e0e0e0;background:#1a1a2e;padding:32px;border-radius:8px;">
            <h1 style="color:#5865f2;">You were mentioned</h1>
            <p><strong>${escapeHtml(authorName || 'Someone')}</strong> mentioned @${escapeHtml(u.username)}:</p>
            <blockquote style="color:#aaa;">${escapeHtml(content).slice(0, 500)}</blockquote>
          </div>`,
        }).catch(() => {});
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
