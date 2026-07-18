// Prepares the hosted-build app-config.json.
// Run before `electron-builder` for a hosted SaaS release.
//
// Usage:
//   VOX_SERVER_URL=https://vox-backend.up.railway.app npm run build:hosted
// The frontend bundle (already built by `build:frontend`) gets its
// app-config.json rewritten to point at the hosted backend, so the packaged
// EXE connects to your servers with zero user configuration.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distConfig = path.join(root, 'frontend', 'dist', 'app-config.json');

const serverUrl = process.env.VOX_SERVER_URL || 'http://127.0.0.1:4000';

const payload = { apiBase: serverUrl, mode: 'hosted' };
fs.writeFileSync(distConfig, JSON.stringify(payload, null, 2) + '\n');
console.log(`[prepare-hosted] wrote ${distConfig} -> ${serverUrl}`);
