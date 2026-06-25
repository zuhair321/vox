// Loads .env and validates that the critical variables exist.
// Fails fast at boot with a clear message if something is missing.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env lives at backend root (two levels up from src/lib)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const required = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'TWO_FACTOR_APP_NAME',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing required env vars in backend/.env: ${missing.join(', ')}`);
  console.error('   Copy backend/.env.example to backend/.env and fill in the values.');
  process.exit(1);
}

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:3000';

// Allowed browser origins for CORS (HTTP + Socket.io). The localhost dev
// origins are always allowed; any additional origins (e.g. a tunnel URL) are
// supplied via the comma-separated EXTRA_CORS_ORIGINS env var instead of being
// hardcoded in source — the old code baked in a personal ngrok URL that broke
// for everyone else and leaked a private tunnel.
const corsOrigins = Array.from(
  new Set(
    [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      clientOrigin,
      ...String(process.env.EXTRA_CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ],
  ),
);

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin,
  corsOrigins,
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
  twoFactor: {
    appName: process.env.TWO_FACTOR_APP_NAME || 'VOX',
    // 64 hex chars for AES-256. Falls back to a zero key (dev only) with a warning.
    encryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY
      || '0000000000000000000000000000000000000000000000000000000000000000',
  },
};

const dev = process.env.NODE_ENV !== 'production';
if (dev && env.twoFactor.encryptionKey.startsWith('00000')) {
  console.warn('⚠️  TWO_FACTOR_ENCRYPTION_KEY is the dev default. Set a real key before production.');
}
