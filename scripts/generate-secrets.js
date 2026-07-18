// Prints fresh, production-grade secrets for VOX.
// Usage: node scripts/generate-secrets.js
import crypto from 'node:crypto';

const access = crypto.randomBytes(48).toString('hex');
const refresh = crypto.randomBytes(48).toString('hex');
const twoFactor = crypto.randomBytes(32).toString('hex');

console.log('# Paste these into backend/.env (and your host secret manager).');
console.log('# NEVER commit backend/.env — it is gitignored.');
console.log(`JWT_ACCESS_SECRET="${access}"`);
console.log(`JWT_REFRESH_SECRET="${refresh}"`);
console.log(`TWO_FACTOR_ENCRYPTION_KEY="${twoFactor}"`);
console.log('# Example DATABASE_URL (replace host/user/password):');
console.log('DATABASE_URL="postgresql://vox:YOUR_PASSWORD@127.0.0.1:5432/vox_dev"');
