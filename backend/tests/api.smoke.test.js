// ═══════════════════════════════════════════════════════════════
// VOX — API Smoke Tests
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = process.env.API_URL || 'http://127.0.0.1:4000';

async function api(method, path, body, cookies) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) headers['Cookie'] = cookies;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, setCookie };
}

describe('Health', () => {
  it('GET /api/health returns ok', async () => {
    const { status, json } = await api('GET', '/api/health');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('GET /health returns ok', async () => {
    const { status, json } = await api('GET', '/health');
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

describe('Auth', () => {
  const testUser = {
    email: `test${Date.now()}@vox.test`,
    username: `testuser${Date.now()}`,
    password: 'TestPassword123!',
  };
  let cookies = '';

  it('POST /api/auth/register creates account', async () => {
    const { status, json, setCookie } = await api('POST', '/api/auth/register', testUser);
    expect(status).toBe(201);
    expect(json.user).toBeDefined();
    expect(json.user.email).toBe(testUser.email);
    if (setCookie) cookies = setCookie.split(';')[0];
  });

  it('POST /api/auth/login signs in', async () => {
    const { status, json } = await api('POST', '/api/auth/login', {
      emailOrUsername: testUser.email,
      password: testUser.password,
    });
    expect(status).toBe(200);
    expect(json.user).toBeDefined();
  });

  it('GET /api/auth/me returns user when authenticated', async () => {
    const { status, json } = await api('GET', '/api/auth/me', null, cookies);
    expect(status).toBe(200);
    expect(json.user).toBeDefined();
  });

  it('GET /api/auth/me returns 401 when unauthenticated', async () => {
    const { status } = await api('GET', '/api/auth/me');
    expect(status).toBe(401);
  });

  it('POST /api/auth/register rejects duplicate email', async () => {
    const { status } = await api('POST', '/api/auth/register', testUser);
    expect(status).toBe(409);
  });

  it('POST /api/auth/register rejects short password', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      email: 'new@test.com',
      username: 'newuser',
      password: 'short',
    });
    expect(status).toBe(400);
  });
});

describe('Servers', () => {
  let serverId;
  let cookies = '';

  beforeAll(async () => {
    const user = {
      email: `server${Date.now()}@vox.test`,
      username: `serveradmin${Date.now()}`,
      password: 'AdminPass123!',
    };
    await api('POST', '/api/auth/register', user);
    const login = await api('POST', '/api/auth/login', {
      emailOrUsername: user.email,
      password: user.password,
    });
    if (login.setCookie) cookies = login.setCookie.split(';')[0];
  });

  it('POST /api/servers creates server', async () => {
    const { status, json } = await api('POST', '/api/servers', { name: 'Test Server' }, cookies);
    expect(status).toBe(201);
    expect(json.server).toBeDefined();
    serverId = json.server.id;
  });

  it('GET /api/servers lists user servers', async () => {
    const { status, json } = await api('GET', '/api/servers', null, cookies);
    expect(status).toBe(200);
    expect(Array.isArray(json.servers)).toBe(true);
  });

  it('GET /api/servers/:id returns server details', async () => {
    if (!serverId) return;
    const { status, json } = await api('GET', `/api/servers/${serverId}`, null, cookies);
    expect(status).toBe(200);
    expect(json.server).toBeDefined();
  });
});

describe('Messages', () => {
  it('GET /api/channels/:id/messages requires auth', async () => {
    const { status } = await api('GET', '/api/channels/fake-id/messages');
    expect(status).toBe(401);
  });
});

describe('Rate Limiting', () => {
  it('Returns 429 when rate limit exceeded', async () => {
    const promises = [];
    for (let i = 0; i < 110; i++) {
      promises.push(api('GET', '/api/health'));
    }
    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});

describe('API Documentation', () => {
  it('GET /api/docs.json returns OpenAPI spec', async () => {
    const { status, json } = await api('GET', '/api/docs.json');
    expect(status).toBe(200);
    expect(json.openapi).toBe('3.0.3');
    expect(json.paths).toBeDefined();
  });

  it('GET /api/docs returns HTML', async () => {
    const { status } = await api('GET', '/api/docs');
    expect(status).toBe(200);
  });
});
