// Deploy-time migration runner with connection-pooler awareness.
//
// Problem: Supabase's pooler (port 6543, transaction mode) is required for
// the running app to avoid exhausting Postgres connections, BUT `prisma migrate
// deploy` opens multiple prepared statements / advisory locks that the pooler's
// transaction mode can't proxy. Running migrations through the pooler fails
// intermittently.
//
// Fix: prefer DATABASE_MIGRATE_URL (the DIRECT connection, port 5432) for
// migrations, and fall back to DATABASE_URL if it isn't set.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const migrateUrl = process.env.DATABASE_MIGRATE_URL || process.env.DATABASE_URL;
if (!migrateUrl) {
  console.error('[migrate] Neither DATABASE_MIGRATE_URL nor DATABASE_URL is set.');
  process.exit(1);
}

console.log('[migrate] Using direct connection for migrations (pooler-aware).');
const result = spawnSync(
  'npx',
  ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
  {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: migrateUrl },
    shell: true,
  },
);

process.exit(result.status ?? 1);
