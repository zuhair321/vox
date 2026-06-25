// Backend origin. Defaults to the local dev backend (port 4000, matching
// backend/.env) but can be overridden at build time with VITE_API_BASE so the
// same bundle can target a remote/tunnelled backend without code changes.
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:4000';

export function getToken() {
  return localStorage.getItem('vox_token');
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
    localStorage.removeItem('vox_token');
    localStorage.removeItem('vox_refresh_token');
    localStorage.removeItem('vox_user');
    window.location.href = '/login';
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
