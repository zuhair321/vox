// ─────────────────────────────────────────────────────────────
// VOX seed — idempotent. Run:  npx prisma db seed
// Creates the default workspace channels + a demo "Mira" user +
// a few welcome messages so the app isn't empty on first launch.
// ─────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Demo users ─────────────────────────────────────────────
  const mira = await prisma.user.upsert({
    where: { username: 'mira' },
    update: { role: 'MEMBER', status: 'ONLINE' },
    create: {
      username: 'mira',
      email: 'mira@vox.local',
      displayName: 'Mira',
      passwordHash: await bcrypt.hash('demo1234', 10),
      role: 'MEMBER',
      color: '#8b5cf6',
      status: 'ONLINE',
    },
  });

  const zed = await prisma.user.upsert({
    where: { username: 'zed' },
    update: { role: 'MEMBER', status: 'ONLINE' },
    create: {
      username: 'zed',
      email: 'zed@vox.local',
      displayName: 'Zed',
      passwordHash: await bcrypt.hash('demo1234', 10),
      role: 'MEMBER',
      color: '#14b8a6',
      status: 'ONLINE',
    },
  });

  const nova = await prisma.user.upsert({
    where: { username: 'nova' },
    update: { role: 'MEMBER', status: 'IDLE' },
    create: {
      username: 'nova',
      email: 'nova@vox.local',
      displayName: 'Nova',
      passwordHash: await bcrypt.hash('demo1234', 10),
      role: 'MEMBER',
      color: '#f97316',
      status: 'IDLE',
    },
  });

  const zuhair = await prisma.user.upsert({
    where: { username: 'zuhair' },
    update: {
      email: 'zuhair@vox.local',
      displayName: 'zuhair',
      passwordHash: await bcrypt.hash('13201', 10),
      role: 'FOUNDER',
      color: '#7700ff',
      status: 'ONLINE',
    },
    create: {
      username: 'zuhair',
      email: 'zuhair@vox.local',
      displayName: 'zuhair',
      passwordHash: await bcrypt.hash('13201', 10),
      role: 'FOUNDER',
      color: '#7700ff',
      status: 'ONLINE',
    },
  });

  // ── Channels (slugs match the frontend fallback) ───────────
  const channels = [
    { id: 'welcome',     name: 'welcome',     topic: 'Landing zone for new members',  type: 'TEXT',  position: 0 },
    { id: 'general',     name: 'general',     topic: 'General VOX chatter',           type: 'TEXT',  position: 1 },
    { id: 'ship-room',   name: 'ship-room',    topic: 'Build notes and release checks', type: 'TEXT',  position: 2 },
    { id: 'voice-lobby', name: 'voice-lobby', topic: 'Voice channel staging',         type: 'VOICE', position: 3 },
  ];

  for (const c of channels) {
    await prisma.channel.upsert({
      where: { id: c.id },
      update: { name: c.name, topic: c.topic, type: c.type, position: c.position },
      create: c,
    });
  }

  const server = await prisma.server.upsert({
    where: { id: 'vox-main' },
    update: {
      name: 'VOX',
      description: 'Dark Matter Villain command center',
      ownerId: zuhair.id,
    },
    create: {
      id: 'vox-main',
      name: 'VOX',
      description: 'Dark Matter Villain command center',
      ownerId: zuhair.id,
    },
  });

  for (const user of [mira, zed, nova, zuhair]) {
    await prisma.serverMember.upsert({
      where: { serverId_userId: { serverId: server.id, userId: user.id } },
      update: { role: user.username === 'zuhair' ? 'FOUNDER' : 'MEMBER' },
      create: {
        serverId: server.id,
        userId: user.id,
        role: user.username === 'zuhair' ? 'FOUNDER' : 'MEMBER',
      },
    });
  }

  for (const c of channels) {
    await prisma.channel.update({
      where: { id: c.id },
      data: { serverId: server.id },
    });
  }

  // ── Welcome messages (only if a channel is empty) ──────────
  await seedMessageIfEmpty('welcome', mira.id, 'Welcome to VOX. The local MVP is online and ready to test.');
  await seedMessageIfEmpty('general', zed.id, 'Moderation, themes, channels, and the free Nitro claim are wired for this demo.');
  await seedMessageIfEmpty('ship-room', nova.id, 'Backend heartbeat is coming from Express + Prisma on port 4000.');

  console.log('✅ VOX seed complete.');
}

async function seedMessageIfEmpty(channelId, userId, body) {
  const count = await prisma.message.count({ where: { channelId } });
  if (count > 0) return;
  await prisma.message.create({ data: { channelId, userId, body } });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
