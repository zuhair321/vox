// Auth smoke test — exercises the real auth flows end-to-end against Postgres.
// Creates a unique test user per run and deletes it (and its tokens) afterwards.
//
// Requires:
//   DATABASE_URL            (postgresql://...)
//   JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / TWO_FACTOR_ENCRYPTION_KEY
//   (these are loaded from backend/.env by src/lib/env.js)
//
// Run: npm test
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as otplib from 'otplib';
import { prisma } from '../src/lib/prisma.js';
import {
  register,
  login,
  refreshTokens,
  logout,
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  completeTwoFactorLogin,
} from '../src/services/auth.service.js';

// otplib v13 functional API.
const { generate: totpGenerate } = otplib;

const suffix = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
const email = `smoke_${suffix}@vox.test`;
const username = `smoke_${suffix}`.slice(0, 32);
const password = 'Sup3rSecret!123';

const device = {
  deviceInfo: 'vitest-smoke',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
};

async function cleanup() {
  const u = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  if (u) {
    await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
    await prisma.passwordReset.deleteMany({ where: { userId: u.id } });
    await prisma.loginHistory.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('auth smoke', () => {
  it('registers a user and returns tokens', async () => {
    const { user, tokens } = await register({ email, username, password }, device);
    expect(user.email).toBe(email);
    expect(user.username).toBe(username);
    expect(tokens.access).toBeTruthy();
    expect(tokens.refresh).toBeTruthy();
  });

  it('logs in with correct credentials and returns tokens', async () => {
    const res = await login({ emailOrUsername: email, password }, device);
    expect(res.twoFactorRequired).toBeFalsy();
    expect(res.tokens.access).toBeTruthy();
    expect(res.tokens.refresh).toBeTruthy();
  });

  it('rejects login with wrong password', async () => {
    await expect(
      login({ emailOrUsername: email, password: 'wrong-password' }, device),
    ).rejects.toThrow();
  });

  it('rejects login with unknown account', async () => {
    await expect(
      login({ emailOrUsername: 'nobody@vox.test', password }, device),
    ).rejects.toThrow();
  });

  it('refreshes tokens', async () => {
    const { tokens } = await login({ emailOrUsername: email, password }, device);
    const refreshed = await refreshTokens(tokens.refresh);
    expect(refreshed.tokens.access).toBeTruthy();
    expect(refreshed.tokens.refresh).toBeTruthy();
  });

  it('logs out (revokes refresh token)', async () => {
    const { tokens } = await login({ emailOrUsername: email, password }, device);
    const res = await logout(tokens.refresh);
    expect(res.ok).toBe(true);
    // The revoked token can no longer be used to refresh.
    await expect(refreshTokens(tokens.refresh)).rejects.toThrow();
  });

  it('enables 2FA then requires + completes it on login', async () => {
    // Get the user id via a fresh login.
    const { user } = await login({ emailOrUsername: email, password }, device);
    const setup = await beginTwoFactorSetup(user.id);
    expect(setup.secret).toBeTruthy();

    const code = await totpGenerate({ secret: setup.secret });
    const confirmed = await confirmTwoFactorSetup(user.id, code);
    expect(confirmed.enabled).toBe(true);

    // Login now must branch into 2FA.
    const firstLogin = await login({ emailOrUsername: email, password }, device);
    expect(firstLogin.twoFactorRequired).toBe(true);
    expect(firstLogin.tempToken).toBeTruthy();

    // Complete 2FA with a fresh code.
    const code2 = await totpGenerate({ secret: setup.secret });
    const completed = await completeTwoFactorLogin(firstLogin.tempToken, code2);
    expect(completed.tokens.access).toBeTruthy();
    expect(completed.tokens.refresh).toBeTruthy();
  });

  it('returns the same generic error for unknown account and wrong password (no enumeration)', async () => {
    const unknown = login({ emailOrUsername: 'nobody@vox.test', password: 'whatever' }, device);
    const wrong = login({ emailOrUsername: email, password: 'wrong-password' }, device);
    const [a, b] = await Promise.all([unknown.catch((e) => e), wrong.catch((e) => e)]);
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.message).toBe(b.message);
  });

  it('locks the account after repeated failed logins', async () => {
    const victim = `lock_${Date.now()}_${Math.floor(Math.random() * 1e6)}@vox.test`;
    const vuser = `lock_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    await register({ email: victim, username: vuser, password }, device);
    // 10 wrong attempts should trigger a lock (MAX_LOGIN_ATTEMPTS = 10).
    let locked = false;
    for (let i = 0; i < 11; i++) {
      try {
        await login({ emailOrUsername: victim, password: 'bad' }, device);
      } catch (e) {
        if (e.status === 423) locked = true;
      }
    }
    expect(locked).toBe(true);
  });
});
