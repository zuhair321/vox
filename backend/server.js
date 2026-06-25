// Thin launcher so Electron's `spawn('node', ['backend/server.js'])` keeps
// working unchanged. The real app lives in src/server.js.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const child = spawn(
  process.execPath,
  [path.join(__dirname, 'src', 'server.js')],
  { stdio: 'inherit', cwd: __dirname },
);

child.on('error', (err) => {
  console.error('[vox] failed to start backend:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
