// Backend origin resolution order (Option 1 — hosted SaaS EXE):
//   1. Runtime injection from the packaged app (window.__VOX_CONFIG.apiBase),
//      loaded by Electron from app-config.json / VOX_API_BASE env.
//   2. Build-time VITE_API_BASE (web/Railway deployments).
//   3. Local dev backend default (port 4000).
// Backend origin resolution — LAZY. The renderer can swap the target
// server mid-session (via Settings → Server), and a full reload is
// wasteful. Each call re-reads window.__VOX_CONFIG (kept fresh by preload).
//
// Priority each call:
//   1. window.__VOX_CONFIG.apiBase
//   2. Build-time VITE_API_BASE
//   3. Local dev backend default (http://127.0.0.1:4000)
export function getApiBase(): string {
  try {
    const injected = window.__VOX_CONFIG && window.__VOX_CONFIG.apiBase;
    if (typeof injected === 'string' && injected.length) return injected.replace(/\/$/, '');
  } catch { /* ignore */ }
  return (import.meta.env.VITE_API_BASE || 'http://127.0.0.1:4000').replace(/\/$/, '');
}

// Backwards-compat alias (legacy callers).
export const API_BASE = getApiBase();

// ── Reachability probe (no auth, no rate-limit) ────────────────────────────────────
// Used by the Welcome screen "Test server" button and OfflineScreen "Retry".
// Hits /api/server-info (no-auth, no-rate-limit) for cheap reachability +
// identity check. Returns the resolved { ok, status, latencyMs, info, reason }.
export async function testReachability(apiBaseOverride?: string): Promise<{
  ok: boolean;
  status?: number;
  latencyMs: number | null;
  reason?: string;
  info?: { name?: string; version?: string; allowRegistration?: boolean } | null;
}> {
  const base = (apiBaseOverride || getApiBase()).replace(/\/$/, '');
  try { new URL(base); }
  catch { return { ok: false, latencyMs: null, reason: 'bad-url' }; }
  const url = base + '/api/server-info';
  const start = Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), 5000);
  try {
    const res = await fetch(url, { method: 'GET', credentials: 'omit', signal: controller?.signal });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    if (!res.ok) return { ok: false, status: res.status, latencyMs, reason: 'http-' + res.status };
    let info: any = null;
    try { info = await res.json(); } catch { /* not JSON */ }
    return { ok: true, status: res.status, latencyMs, info };
  } catch (e: any) {
    clearTimeout(timer);
    return { ok: false, latencyMs: null, reason: e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch-failed') };
  }
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

// Shared, deduped refresh. All refresh paths (401 retries, upload retries)
// must go through this single promise so two concurrent refreshes can never
// race the server's token handling and invalidate each other.
export async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/refresh`, {
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

// ── Proactive session maintenance ──────────────────────────────────────────────────
// Background refresh scheduler so the SPA never sits on an expired access
// token (which would surface as a flicker of "signing you in" or a 401
// retry-after-refresh). The refresh token cookie is valid for 30 days, and
// each successful /refresh bumps the access TTL back to 30m. Refreshing
// every 25m means we hold a token with ~5m of runway at all times, so the
// next interaction never crosses an expiry boundary.
//
// `startProactiveRefresh()` is idempotent — call it on app mount and again
// after login or a successful refresh. It is safe across React StrictMode
// double-mounts.
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;
const PROACTIVE_INTERVAL_MS = 25 * 60 * 1000; // 25 minutes (< access TTL of 30m)

export function startProactiveRefresh(): void {
  if (proactiveTimer) return;
  const tick = () => {
    proactiveTimer = setTimeout(async () => {
      proactiveTimer = null;
      try {
        // Best-effort: don't surface errors here. The 401-retry path has full
        // fallback handling; this is just to keep the long-lived access
        // token warm so busy users never feel a session interruption.
        await tryRefresh();
      } catch {
        /* ignored — proactive refresh is best-effort */
      }
      tick();
    }, PROACTIVE_INTERVAL_MS);
  };
  tick();
}

export function stopProactiveRefresh(): void {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
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

// Backend JSON responses are untyped; callers pass an explicit generic or
// cast where they need a concrete shape.
function extractError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.error === 'string') return d.error;
    if (typeof d.message === 'string') return d.message;
  }
  return fallback;
}

// The `any` default keeps untyped call sites working; typed callers pass an
// explicit generic (e.g. api<{ config: ArchiveConfig }>(...)).
// Build the right header set whether the body is JSON or a FormData
// multipart upload. We have to skip 'Content-Type: application/json'
// for FormData so the browser can set the multipart boundary itself
// (otherwise the parser won't recognize the parts).
function buildHeaders(customHeaders: HeadersInit | undefined, body: unknown): Record<string, string> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (customHeaders) {
    const incoming = new Headers(customHeaders);
    incoming.forEach((value, key) => {
      // Caller-provided Content-Type wins for non-FormData; for FormData,
      // explicitly drop any Content-Type the caller set so the boundary is added.
      if (isFormData && key.toLowerCase() === 'content-type') return;
      headers[key] = value;
    });
  }
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional generic default for untyped JSON responses
export async function api<T = any>(path: string, options: RequestInit & { skipAuth?: boolean } = {}, _retry = false): Promise<T> {
  const { skipAuth = false, headers: customHeaders, body, ...rest } = options;
  let res: Response | null = null;
  let data: unknown;

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
      const requestHeaders = skipAuth
        ? buildHeaders(customHeaders, body)
        : (() => { const h = buildHeaders(customHeaders, body); if (h.Authorization && getToken() === null) delete h.Authorization; return h; })();
      res = await fetch(getApiBase() + path, {
        ...rest,
        body,
        headers: requestHeaders,
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
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retryHeaders = buildHeaders(customHeaders, body);
      const retryRes = await fetch(getApiBase() + path, {
        ...rest,
        body,
        headers: retryHeaders,
        credentials: 'include',
      });
      if (retryRes.status === 401) {
        const logoutFn = await getLogout();
        logoutFn();
        // Quietly route the user back to /login via React Router (defined in
        // utils/nav.ts) instead of a hard reload. We avoid the alarming
        // "Session Expired" toast — the route change itself signals what's
        // happening. A short, single, neutral notice is enough.
        try {
          const notifStore = (await import('../stores/notificationStore')).useNotificationStore;
          notifStore.getState().addNotification({
            type: 'warning',
            title: 'Please sign in again',
            messageId: 'Your session ended. Please sign in to continue.',
          });
        } catch { /* ignore */ }
        throw new Error('Session ended. Please sign in to continue.');
      }
      let data: unknown;
      try {
        data = await retryRes.json();
      } catch {
        data = null;
      }
      if (!retryRes.ok) {
        throw new Error(extractError(data, retryRes.statusText || `HTTP ${retryRes.status}`));
      }
      return data as T;
    }
    const logoutFn = await getLogout();
    logoutFn();
    // Same gentle UX as above — no alarming toast, just a single neutral
    // notice and the route change to /login (handled by logoutFn).
    try {
      const notifStore = (await import('../stores/notificationStore')).useNotificationStore;
      notifStore.getState().addNotification({
        type: 'warning',
        title: 'Please sign in again',
        messageId: 'Your session ended. Please sign in to continue.',
      });
    } catch { /* ignore */ }
    throw new Error('Session ended. Please sign in to continue.');
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const d = data as { retryAfter?: number } | null;
    const seconds = retryAfter ? parseInt(retryAfter, 10) : (d?.retryAfter ? Math.ceil(d.retryAfter) : 60);
    const err = new Error(extractError(data, `You're doing that too fast. Please wait ${seconds}s.`)) as Error & { rateLimited?: boolean; retryAfter?: number; status?: number };
    err.rateLimited = true;
    err.retryAfter = seconds;
    err.status = 429;
    throw err;
  }

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg = extractError(data, res.statusText || `HTTP ${res.status}`);
    console.error(`[API] Error on ${path}:`, errorMsg);
    throw new Error(errorMsg);
  }

  return data as T;
}
