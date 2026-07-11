/**
 * VOX — PostgreSQL Database Setup Script
 *
 * Run:  node db-setup.js
 *
 * What this does (and what it does NOT do):
 *   ✓ Starts nothing.
 *   ✓ Verifies DATABASE_URL is present in backend/.env.
 *   ✗ Does NOT overwrite DATABASE_URL in .env. If your .env points at the
 *     wrong DB or user, edit it directly.
 *
 * Prerequisites:
 *   1. PostgreSQL is running and reachable at the host/port in DATABASE_URL.
 *   2. backend/.env exists and contains DATABASE_URL.
 *   3. Run `npm install` inside backend once (so pg is available for the
 *      init script if needed).
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL is missing from backend/.env.');
  console.error('   Add: DATABASE_URL="postgresql://vox:YOUR_PASSWORD@127.0.0.1:5432/vox_dev"');
  process.exit(1);
}

const masked = dbUrl.replace(/:[^:@/]+@/, ':****@');
console.log('🔧 VOX PostgreSQL Database Setup\n');
console.log(`   .env says: ${masked}\n`);
console.log('✅ DATABASE_URL is configured. Use `npx prisma migrate deploy` to apply schema.');
