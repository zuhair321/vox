import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const fks = [
  `ALTER TABLE "Badge" ADD CONSTRAINT "Badge_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Sound" ADD CONSTRAINT "Sound_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "StageSpeaker" ADD CONSTRAINT "StageSpeaker_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];
for (const s of fks) { try { await prisma.$executeRawUnsafe(s); console.log('OK fk'); } catch (e) { console.error('FK FAIL:', e.message); } }
await prisma.$disconnect();
