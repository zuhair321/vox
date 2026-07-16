// apply-automod-tables.mjs — idempotently creates the AutomodConfig + Strike tables.
// Used instead of a full `prisma db push` because the local dev DB has pre-existing
// drift/orphan rows that block a global push. Safe to run repeatedly.
import { prisma } from '../src/lib/prisma.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS "AutomodConfig" (
     "id" TEXT PRIMARY KEY,
     "serverId" TEXT NOT NULL UNIQUE,
     "filterWords" BOOLEAN NOT NULL DEFAULT true,
     "filterLinks" BOOLEAN NOT NULL DEFAULT true,
     "filterSpam" BOOLEAN NOT NULL DEFAULT true,
     "maxStrikes" INTEGER NOT NULL DEFAULT 3,
     "strikeTimeout" INTEGER NOT NULL DEFAULT 1440,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS "Strike" (
     "id" TEXT PRIMARY KEY,
     "serverId" TEXT NOT NULL,
     "userId" TEXT NOT NULL,
     "issuedBy" TEXT NOT NULL,
     "reason" TEXT NOT NULL,
     "auto" BOOLEAN NOT NULL DEFAULT false,
     "active" BOOLEAN NOT NULL DEFAULT true,
     "expiresAt" TIMESTAMP(3),
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE INDEX IF NOT EXISTS "Strike_serverId_userId_idx" ON "Strike" ("serverId", "userId")`,
];

// Foreign keys added separately so a missing/renamed constraint doesn't abort table creation.
const fkStatements = [
  {
    name: 'AutomodConfig_serverId_fkey',
    sql: `ALTER TABLE "AutomodConfig" ADD CONSTRAINT "AutomodConfig_serverId_fkey"
          FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    name: 'Strike_serverId_fkey',
    sql: `ALTER TABLE "Strike" ADD CONSTRAINT "Strike_serverId_fkey"
          FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
];

async function main() {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
    console.log('  ✓', sql.split('\n')[0].trim());
  }
  for (const { name, sql } of fkStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('  ✓ FK', name);
    } catch (e) {
      if (String(e.message).includes('already exists')) console.log('  = FK', name, '(exists)');
      else throw e;
    }
  }
  console.log('\nAutomodConfig + Strike tables are ready.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
