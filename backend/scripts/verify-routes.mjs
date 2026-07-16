#!/usr/bin/env node
// verify-routes.mjs — fails if any Express router file is not mounted in server.js.
// Run: npm run verify:routes  (from backend/)
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '..', 'src', 'routes');
const serverFile = path.join(__dirname, '..', 'src', 'server.js');

const server = readFileSync(serverFile, 'utf8');
const files = readdirSync(routesDir).filter((f) => f.endsWith('.js') && f !== 'index.js');

const problems = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(path.join(routesDir, file), 'utf8');
  // Find exported routers: `export const fooRouter = Router()` or `export const foo = Router(...)`
  const exportMatches = [...src.matchAll(/export\s+const\s+(\w+)\s*=\s*Router\s*\(/g)].map((m) => m[1]);
  if (exportMatches.length === 0) continue; // not a router module
  checked++;

  const imported = server.includes(`./routes/${file}`);
  const mounted = exportMatches.some((name) => new RegExp(`app\\.use\\([^)]*\\b${name}\\b`).test(server));

  if (!imported) problems.push(`  ✗ ${file} — exports [${exportMatches.join(', ')}] but is NOT imported in server.js`);
  else if (!mounted) problems.push(`  ✗ ${file} — imported but NOT mounted via app.use()`);
}

if (problems.length) {
  console.error(`\n[verify:routes] ${problems.length} orphaned router file(s) found:\n`);
  console.error(problems.join('\n'));
  console.error('\nEvery router must be imported AND mounted in src/server.js.\n');
  process.exit(1);
}

console.log(`[verify:routes] OK — all ${checked} router files are mounted in server.js.`);
