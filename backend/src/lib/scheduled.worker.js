// Scheduled message delivery worker.
// Polls the database for scheduled messages whose time has arrived and delivers
// them into their channels. Runs a single setInterval loop; safe to call once
// at server boot. Skips messages that are already flagged sent.
import { prisma } from '../lib/prisma.js';
import { deliverScheduledMessage } from '../routes/scheduled.routes.js';

const POLL_INTERVAL_MS = 15 * 1000; // every 15s
let timer = null;

export function startScheduledWorker() {
  if (timer) return; // idempotent
  console.log('[scheduled] worker started (interval ' + POLL_INTERVAL_MS + 'ms)');
  timer = setInterval(() => {
    runOnce().catch((e) => console.warn('[scheduled] worker tick failed:', e?.message));
  }, POLL_INTERVAL_MS);
  timer.unref?.();
}

export function stopScheduledWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export async function runOnce() {
  const due = await prisma.scheduledMessage.findMany({
    where: { sent: false, scheduledAt: { lte: new Date() } },
    take: 50,
  });
  if (due.length === 0) return { delivered: 0 };

  let delivered = 0;
  for (const s of due) {
    try {
      await deliverScheduledMessage(s);
      delivered++;
    } catch (e) {
      console.warn(`[scheduled] failed to deliver ${s.id}:`, e?.message);
    }
  }
  return { delivered };
}
