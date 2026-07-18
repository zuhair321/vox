// Node load harness — simulates 100 concurrent VOX users against a running
// backend (no external deps). Mirrors loadtest/load-test.js (k6) but runs with
// plain Node so it works without k6 installed.
//
// Usage:
//   node scripts/load-harness.mjs
//   VOX_BASE=http://127.0.0.1:4000 CONCURRENCY=100 DURATION_MS=120000 node scripts/load-harness.mjs
//
// Thresholds (same as k6): p95 latency < 800ms, error rate < 5%.

const BASE = process.env.VOX_BASE || 'http://127.0.0.1:4000';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '100', 10);
const DURATION_MS = parseInt(process.env.DURATION_MS || '120000', 10);
const CREATE_USERS = process.env.CREATE_USERS === 'true';
const SHARED_EMAIL = 'loaduser@vox.test';
const SHARED_PASSWORD = 'LoadTest!12345';

const latencies = [];
let requests = 0;
let errors = 0;
let stop = false;

function record(ms, ok) {
  requests++;
  latencies.push(ms);
  if (!ok) errors++;
}

async function post(path, body, headers = {}) {
  const t = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    record(Date.now() - t, res.status < 500);
    return res;
  } catch {
    record(Date.now() - t, false);
    return null;
  }
}

async function get(path, headers = {}) {
  const t = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { headers });
    record(Date.now() - t, res.status < 500);
    return res;
  } catch {
    record(Date.now() - t, false);
    return null;
  }
}

async function userIteration(vu) {
  const email = CREATE_USERS ? `load_${vu}_${Date.now()}@vox.test` : SHARED_EMAIL;
  const username = CREATE_USERS ? `load_${vu}_${Date.now()}` : `load_${vu}`;
  const password = CREATE_USERS ? `LoadTest!${vu}2345` : SHARED_PASSWORD;

  if (CREATE_USERS) {
    await post('/api/auth/register', { email, username, password });
  }

  const loginRes = await post('/api/auth/login', {
    emailOrUsername: email,
    password,
  });

  let access = '';
  let refresh = '';
  try {
    const b = await loginRes?.json();
    if (b?.tokens) {
      access = b.tokens.access;
      refresh = b.tokens.refresh;
    }
  } catch {}

  if (!access) return; // login failed → counted as error already

  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` };
  await get('/api/auth/me', auth);
  await get('/api/servers', auth);
  await post('/api/auth/refresh', { refreshToken: refresh }, { 'Content-Type': 'application/json' });
}

async function worker(vu) {
  while (!stop) {
    await userIteration(vu);
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 1500) + 300));
  }
}

function pct(p) {
  if (!latencies.length) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

(async () => {
  console.log(`[load] ${CONCURRENCY} concurrent users for ${DURATION_MS / 1000}s against ${BASE}`);
  console.log(`[load] CREATE_USERS=${CREATE_USERS}`);
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) workers.push(worker(i));
  await new Promise((r) => setTimeout(r, DURATION_MS));
  stop = true;
  await Promise.all(workers);

  const errorRate = requests ? (errors / requests) * 100 : 0;
  console.log('──────── LOAD TEST RESULTS ────────');
  console.log(`requests:     ${requests}`);
  console.log(`errors:       ${errors} (${errorRate.toFixed(2)}%)`);
  console.log(`latency p50:  ${pct(50)}ms`);
  console.log(`latency p95:  ${pct(95)}ms`);
  console.log(`latency p99:  ${pct(99)}ms`);
  console.log(`latency max:  ${Math.max(...latencies)}ms`);
  const pass = pct(95) < 800 && errorRate < 5;
  console.log(`RESULT:       ${pass ? 'PASS ✅' : 'FAIL ❌'} (threshold p95<800ms, err<5%)`);
  process.exit(pass ? 0 : 1);
})();
