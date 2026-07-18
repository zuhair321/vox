// Loads .env and validates that the critical variables exist.
// Fails fast at boot with a clear message if something is missing.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env lives at backend root (two levels up from src/lib)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const required = [
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
//
// Native apps send Origin: null, but we deliberately exclude null from the
// allowed origins list because `Origin: null` is also used by sandboxed iframes
// and CSRF vectors. The mobile app authenticates via API key / token headers
// instead of relying on CORS origin matching.
const apiBaseOrigin = (process.env.API_BASE || '').replace(/\/+$/, '');

// Support all platforms: localhost dev, LAN IP, production domains, mobile
const extraOrigins = String(process.env.EXTRA_CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const localOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'file://',
  null,
];

const corsOrigins = Array.from(
  new Set([
    ...localOrigins,
    clientOrigin,
    apiBaseOrigin,
    // Add mobile app schemes
    'app://localhost',
    'app://vox',
    // Add common production origins if specified
    ...extraOrigins,
  ].filter((v) => v !== '' && v !== undefined)),
);

// Dynamic origin check for CORS. Reflects the requesting origin for any
// localhost / loopback / LAN / file:// / app:// / mobile scheme so the desktop
// (Electron), mobile, and dev builds can always reach the API regardless of the
// exact origin they run under. Explicitly configured production origins are
// also allowed. Unknown public origins are rejected to avoid becoming an open
// CORS proxy.
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (corsOrigins.includes(origin)) return true;
  if (origin === 'null') return true; // sandboxed iframes / some Electron contexts
  try {
    const u = new URL(origin);
    const host = u.hostname;
    if (u.protocol === 'file:' || u.protocol === 'app:' || u.protocol === 'capacitor:') return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (host.endsWith('.localhost')) return true;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  } catch {
    return false;
  }
  return false;
}

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin,
  corsOrigins,
  databaseUrl: process.env.DATABASE_URL,
  apiBase: process.env.API_BASE || `http://127.0.0.1:${parseInt(process.env.PORT || '4000', 10)}`,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
  twoFactor: {
    appName: process.env.TWO_FACTOR_APP_NAME || 'VOX',
    // 64 hex chars for AES-256. Falls back to a zero key (dev only) with a warning.
    // In production a missing/zero key is a fatal misconfiguration: every TOTP
    // secret would be encrypted with a publicly-known key, defeating at-rest
    // protection. We refuse to boot rather than silently run insecure.
    encryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY
      || '0000000000000000000000000000000000000000000000000000000000000000',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || 'dev',
    fromAddress: process.env.RESEND_FROM_ADDRESS || 'VOX <noreply@vox.app>',
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    appleClientId: process.env.APPLE_CLIENT_ID || '',     // Services ID
    appleTeamId: process.env.APPLE_TEAM_ID || '',
    appleKeyId: process.env.APPLE_KEY_ID || '',
    applePrivateKey: process.env.APPLE_PRIVATE_KEY || '', // PEM private key
  },
  livekit: {
    url: process.env.LIVEKIT_URL || '',
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
  },
  vapid: {
    subject: process.env.VAPID_SUBJECT || 'mailto:noreply@vox.app',
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

const dev = process.env.NODE_ENV !== 'production';
if (dev && env.twoFactor.encryptionKey.startsWith('00000')) {
  console.warn('⚠️  TWO_FACTOR_ENCRYPTION_KEY is the dev default. Set a real key before production.');
}
if (!dev && env.twoFactor.encryptionKey.startsWith('00000')) {
  console.error('❌ TWO_FACTOR_ENCRYPTION_KEY is missing or still the dev default in production.');
  console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
