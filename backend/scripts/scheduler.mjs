// VOX scheduled jobs (roadmap: reminders, strike expiry, message archiving).
//
// Can run two ways:
//   1. As a one-shot command: `node scripts/scheduler.mjs` (Railway cron re-invokes
//      on its schedule). Designed for a second lightweight service that reuses the
//      same backend image. Idempotent — re-running never double-fires.
//   2. In-process: import { startScheduler } and call it at server boot so the
//      desktop / single-process build gets the same periodic maintenance without a
//      separate cron service. Safe to run even if the main API is down — it only
//      talks to Postgres.
import { PrismaClient } from '@prisma/client';

const now = new Date();

// Reuse the shared Prisma client when imported by src/server.js; otherwise fall
// back to a standalone client (one-shot cron mode). Cached after first resolve.
let _prismaPromise = null;
let _standalonePrisma = null;
async function getPrisma() {
  if (_prismaPromise) return _prismaPromise;
  _prismaPromise = (async () => {
    try {
      const mod = await import('../src/lib/prisma.js');
      if (mod.prisma) return mod.prisma;
    } catch { /* fall through */ }
    _standalonePrisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: ['error'] });
    return _standalonePrisma;
  })();
  return _prismaPromise;
}

export async function fireDueReminders(prisma) {
  const due = await prisma.reminder.findMany({
    where: { sent: false, remindAt: { lte: now } },
    take: 100,
  });
  for (const r of due) {
    try {
      await prisma.reminder.update({ where: { id: r.id }, data: { sent: true } });
      if (r.recurring === 'DAILY' || r.recurring === 'WEEKLY' || r.recurring === 'MONTHLY') {
        const next = new Date(now);
        if (r.recurring === 'DAILY') next.setDate(next.getDate() + 1);
        else if (r.recurring === 'WEEKLY') next.setDate(next.getDate() + 7);
        else next.setMonth(next.getMonth() + 1);
        await prisma.reminder.create({
          data: { userId: r.userId, channelId: r.channelId, message: r.message, remindAt: next, recurring: r.recurring },
        });
      }
    } catch (e) {
      console.error('[scheduler] reminder', r.id, e.message);
    }
  }
  return due.length;
}

export async function expireStrikes(prisma) {
  const res = await prisma.strike.updateMany({
    where: { active: true, expiresAt: { lte: now } },
    data: { active: false },
  });
  return res.count;
}

export async function archiveOldMessages(prisma) {
  const configs = await prisma.channelArchiveConfig.findMany({
    where: { enabled: true },
    take: 50,
  });
  let archived = 0;
  for (const cfg of configs) {
    const cutoff = new Date(now.getTime() - cfg.daysToKeep * 24 * 60 * 60 * 1000);
    try {
      const res = await prisma.message.updateMany({
        where: { channelId: cfg.channelId, deleted: false, createdAt: { lt: cutoff } },
        data: { deleted: true },
      });
      archived += res.count;
    } catch (e) {
      console.error('[scheduler] archive', cfg.channelId, e.message);
    }
  }
  return archived;
}

export async function runSchedulerTick() {
  const prisma = await getPrisma();
  const [reminders, strikes, archived] = await Promise.all([
    fireDueReminders(prisma).catch((e) => { console.error(e); return 0; }),
    expireStrikes(prisma).catch((e) => { console.error(e); return 0; }),
    archiveOldMessages(prisma).catch((e) => { console.error(e); return 0; }),
  ]);
  console.log(`[scheduler] tick — reminders:${reminders} strikesExpired:${strikes} archived:${archived}`);
}

let timer = null;
export function startScheduler(intervalMs = 60 * 1000) {
  if (timer) return;
  console.log('[scheduler] started (interval ' + intervalMs + 'ms)');
  timer = setInterval(() => {
    runSchedulerTick().catch((e) => console.warn('[scheduler] tick failed:', e?.message));
  }, intervalMs);
  timer.unref?.();
}

async function main() {
  await runSchedulerTick();
  // Only disconnect if we created a standalone client (not the shared one).
  if (_standalonePrisma) {
    try { await _standalonePrisma.$disconnect(); } catch { /* ignore */ }
  }
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('[scheduler] fatal', e); process.exit(1); });
}
