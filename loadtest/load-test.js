// VOX load test — simulates 100 concurrent users hitting the API + login flow.
//
// Prerequisites:
//   1. A running VOX backend (Postgres + Redis) at $VOX_BASE (default http://127.0.0.1:4000).
//   2. k6 installed: https://k6.io/docs/get-started/installation/
//   3. A TEST user already registered, or set CREATE_USERS=true to auto-register
//      unique users per VU (requires email sending to be dev/no-op).
//
// Run:
//   k6 run loadtest/load-test.js
//   VOX_BASE=https://vox-backend.up.railway.app k6 run loadtest/load-test.js
//
// This is a smoke/load check, not a correctness test. It asserts p95 latency
// and error rate stay within launch thresholds for 100 VUs.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.VOX_BASE || 'http://127.0.0.1:4000';
const CREATE_USERS = __ENV.CREATE_USERS === 'true';

const errorRate = new Rate('errors');

export const options = {
  // 100 concurrent users ramping up over 1 minute, holding for 2, ramping down.
  stages: [
    { duration: '30s', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests under 800ms
    errors: ['rate<0.05'], // <5% errors
  },
};

const BASE_HEADERS = { 'Content-Type': 'application/json' };

export default function () {
  const vu = __VU;
  const email = `load_${vu}_${__ITER}@vox.test`;
  const username = `load_${vu}_${__ITER}`;
  const password = 'LoadTest!12345';

  let access = '';
  let refresh = '';

  if (CREATE_USERS) {
    const reg = http.post(
      `${BASE}/api/auth/register`,
      JSON.stringify({ email, username, password }),
      { headers: BASE_HEADERS },
    );
    // 200 ok, 409 means already exists — both acceptable.
    check(reg, {
      'register ok or exists': (r) => r.status === 200 || r.status === 409,
    });
  }

  const loginRes = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({
      emailOrUsername: CREATE_USERS ? email : 'loaduser@vox.test',
      password: CREATE_USERS ? password : 'LoadTest!12345',
    }),
    { headers: BASE_HEADERS },
  );

  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has tokens': (r) => {
      try {
        const b = JSON.parse(r.body);
        if (b.tokens) {
          access = b.tokens.access;
          refresh = b.tokens.refresh;
          return true;
        }
      } catch {}
      return false;
    },
  });
  if (!loginOk) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const authHeaders = { ...BASE_HEADERS, Authorization: `Bearer ${access}` };

  // Authenticated endpoints a real client hits.
  const me = http.get(`${BASE}/api/auth/me`, { headers: authHeaders });
  check(me, { 'me 200': (r) => r.status === 200 });

  const servers = http.get(`${BASE}/api/servers`, { headers: authHeaders });
  check(servers, { 'servers 200/401/404 ok': (r) => [200, 401, 404].includes(r.status) });

  // Refresh token rotation.
  const ref = http.post(
    `${BASE}/api/auth/refresh`,
    JSON.stringify({ refreshToken: refresh }),
    { headers: BASE_HEADERS },
  );
  check(ref, { 'refresh 200': (r) => r.status === 200 });

  sleep(Math.random() * 2 + 0.5);
}
