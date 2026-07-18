// Backend origin resolution order (Option 1 — hosted SaaS EXE):
//   1. Runtime injection from the packaged app (window.__VOX_CONFIG.apiBase),
//      loaded by Electron from app-config.json / VOX_API_BASE env.
//   2. Build-time VITE_API_BASE (web/Railway deployments).
//   3. Local dev backend default (port 4000).
// A single built bundle therefore works for both the local-SQLite desktop app
// and a hosted backend — the user never configures anything.
function resolveApiBase(): string {
  try {
    const injected = (window as any).__VOX_CONFIG?.apiBase;
    if (injected && typeof injected === 'string' && injected.length) return injected;
  } catch { /* ignore */ }
  return (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:4000';
}

export const API_BASE = resolveApiBase();
export function getApiBase(): string {
  return API_BASE;
}

export function getToken() {
  // Intentionally returns null. Auth is carried by the HttpOnly `vox_access`
  // cookie (sent automatically via `credentials: 'include'`), so tokens are
  // never exposed to JavaScript. This prevents an XSS bug from stealing a
  // live access/refresh token. The backend accepts the cookie in
  // middleware/auth.js (req.cookies.vox_access).
  return null;
}

// ── Automatic token refresh ───────────────────────────────────────
// When a request gets 401, we hit /api/auth/refresh. The refresh token also
// lives in an HttpOnly cookie, so no token is ever read from or written to
// JS-reachable storage (sessionStorage/localStorage).
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      });
      if (!res.ok) {
        console.warn(`[Auth] Token refresh failed with status ${res.status}:`, await res.text().catch(() => ''));
        return false;
      }
      // New tokens arrive as HttpOnly cookies in the Set-Cookie response;
      // nothing to persist client-side.
      console.log('[Auth] Token refreshed successfully');
      return true;
    } catch (err) {
      console.error('[Auth] Token refresh failed:', err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
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

export async function api<T = any>(path: string, options: RequestInit = {}, _retry = false): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options as any;
  let res: Response | null = null;
  let data: any;

  // ── Resilient fetch with retry ───────────────────────────────
  // In the desktop app the renderer can fire requests (servers, friends,
  // messages) before the backend has finished booting, or while it is
  // briefly restarting. A single failed fetch would otherwise surface as a
  // permanent "Failed to load messages" / empty-channel state. Retry
  // transient network failures (incl. CORS errors that are really a
  // refused connection) a few times before giving up.
  const maxAttempts = 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(API_BASE + path, {
        ...rest,
        headers: {
          'Content-Type': 'application/json',
          ...(customHeaders || {}),
          ...(!skipAuth && getToken() ? { 'Authorization': 'Bearer ' + getToken() } : {}),
        },
        credentials: 'include',
      });
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[API] Network error on ${path} (attempt ${attempt}/${maxAttempts}):`, errorMsg);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
    }
  }
  if (lastErr) {
    const errorMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    console.error(`[API] Network error on ${path}:`, errorMsg);
    throw new Error(`Network error: ${errorMsg}`);
  }

  if (!res) {
    throw new Error('Network error: request failed before response.');
  }

  if (res.status === 401 && !_retry) {
    console.log('[API] Got 401, attempting token refresh...');
    const refreshed = await tryRefresh();
    if (refreshed) {
      console.log('[API] Token refreshed, retrying request');
      const newToken = getToken();
      const retryHeaders = {
        'Content-Type': 'application/json',
        ...(customHeaders || {}),
        ...(newToken ? { 'Authorization': 'Bearer ' + newToken } : {}),
      };
      const retryRes = await fetch(API_BASE + path, {
        ...rest,
        headers: retryHeaders,
        credentials: 'include',
      });
      if (retryRes.status === 401) {
        console.warn('[API] Token refresh failed, logging out');
        const logoutFn = await getLogout();
        logoutFn();
        (await import('../stores/notificationStore')).useNotificationStore.getState().addNotification({
          type: 'error',
          title: 'Session Expired',
          messageId: 'Your session has expired. Please log in again.',
        });
        throw new Error('Session expired. Please log in again.');
      }
      let data: any;
      try {
        data = await retryRes.json();
      } catch {
        data = null;
      }
      if (!retryRes.ok) {
        const errorMsg = data?.error || data?.message || retryRes.statusText || `HTTP ${retryRes.status}`;
        throw new Error(errorMsg);
      }
      return data;
    }
    console.warn('[API] Token refresh failed, logging out');
    const logoutFn = await getLogout();
    logoutFn();
    (await import('../stores/notificationStore')).useNotificationStore.getState().addNotification({
      type: 'error',
      title: 'Session Expired',
      messageId: 'Your session has expired. Please log in again.',
    });
    throw new Error('Session expired. Please log in again.');
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const seconds = retryAfter ? parseInt(retryAfter, 10) : (data?.retryAfter ? Math.ceil(data.retryAfter) : 60);
    const err = new Error(data?.error || `You're doing that too fast. Please wait ${seconds}s.`);
    (err as any).rateLimited = true;
    (err as any).retryAfter = seconds;
    (err as any).status = 429;
    throw err;
  }

  try {
    data = await res.json();
  } catch {
    console.warn(`[API] Failed to parse JSON from ${res.url}, status ${res.status}`);
    data = null;
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || res.statusText || `HTTP ${res.status}`;
    console.error(`[API] Error on ${path}:`, errorMsg);
    throw new Error(errorMsg);
  }

  return data;
}
