import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function test() {
  const files = [
    './routes/message.routes.js',
    './routes/automod.routes.js',
    './routes/custom-powers.routes.js',
    './routes/moderation.routes.js',
  ];
  
  for (const f of files) {
    try {
      const path = pathToFileURL(join(__dirname, f)).href;
      console.log(`Importing ${path}...`);
      await import(path);
      console.log(`  OK`);
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
    }
  }
}

test();
