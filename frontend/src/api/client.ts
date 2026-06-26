// Backend origin. Defaults to the local dev backend (port 4000, matching
// backend/.env) but can be overridden at build time with VITE_API_BASE so the
// same bundle can target a remote/tunnelled backend without code changes.
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:4000';

export function getToken() {
  return localStorage.getItem('vox_token');
}

// Dynamic import keeps the module graph acyclic at eval time: client.ts is
// imported by stores, and auth.ts imports those same stores. The import only
// resolves when logout() actually executes (401 path), which is always after
// the initial module graph has fully loaded.
let logoutFn: (() => void) | null = null;
async function getLogout(): Promise<() => void> {
  if (!logoutFn) {
    const mod = await import('../utils/auth');
    logoutFn = mod.logout;
  }
  return logoutFn;
}

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { 'Authorization': 'Bearer ' + getToken() } : {}),
      ...options.headers
    }
  });

  if (res.status === 401) {
    // Delegate to the central logout helper so all teardown logic lives in
    // one place. This throws (via the redirect) so callers never proceed
    // with a stale session.
    (await getLogout())();
    // Throw instead of returning undefined: callers commonly `await api(...)`
    // and then destructure / chain on the result. Returning undefined turned a
    // routine auth expiry into a "cannot read properties of undefined" crash.
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || res.statusText || 'An error occurred');
  }

  return data;
}
