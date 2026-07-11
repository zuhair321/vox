/**
 * VOX — MySQL Database Setup Script
 *
 * Run:  node db-setup.js
 *
 * What this does (and what it does NOT do):
 *   ✓ Starts nothing. Run start-mysql.bat (or dbms-mysql/start-mysql-fixed.bat)
 *     first to bring the server up.
 *   ✓ Calls dbms-mysql/init-mysql.js to ensure the `vox_dev` database and the
 *     zuhair@127.0.0.1 user exist with the right privileges — BOTH are read
 *     from your existing .env so this script no longer clobbers credentials.
 *   ✗ Does NOT overwrite DATABASE_URL in .env. If your .env points at the
 *     wrong DB or user, edit it directly. (Old versions of this file did a
 *     blind `replace DATABASE_URL=.*` which destroyed the working zuhair/13201
 *     setup — that path is gone.)
 *
 * Prerequisites:
 *   1. MySQL 8.0 installed and running (port 3306 reachable).
 *   2. backend/.env exists and contains DATABASE_URL.
 *   3. Run `npm install` inside backend once (so mysql2 is available for the
 *      init script). The Prisma client alone is not enough for admin tasks.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const initScript = path.resolve(__dirname, '..', 'dbms-mysql', 'init-mysql.js');

if (!fs.existsSync(initScript)) {
  console.error('❌ init script not found at', initScript);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL is missing from backend/.env.');
  console.error('   Add: DATABASE_URL="mysql://zuhair:13201@127.0.0.1:3306/vox_dev"');
  process.exit(1);
}

// Surface a friendly preview so the user can confirm before we touch anything.
const masked = dbUrl.replace(/:[^:@/]+@/, ':****@');
console.log('🔧 VOX MySQL Database Setup\n');
console.log(`   .env says: ${masked}\n`);

console.log('▶ delegating to dbms-mysql/init-mysql.js ...\n');
const r = spawnSync(process.execPath, [initScript], { stdio: 'inherit' });
process.exit(r.status ?? 0);
