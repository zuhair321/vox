// Backend origin. Defaults to the local dev backend (port 4000, matching
// backend/.env) but can be overridden at build time with VITE_API_BASE so the
// same bundle can target a remote/tunnelled backend without code changes.
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:4000';

export function getToken() {
  try {
    return sessionStorage.getItem('vox_access') || null;
  } catch {
    return null;
  }
}

// ── Automatic token refresh ───────────────────────────────────────
// When a request gets 401, we try to refresh the access token using the
// stored refresh token. Only one refresh runs at a time; concurrent 401s
// queue behind the same promise to avoid stampeding the refresh endpoint.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn(`[Auth] Token refresh failed with status ${res.status}:`, await res.text().catch(() => ''));
        return false;
      }
      const data = await res.json();
      if (data?.tokens?.access) {
        console.log('[Auth] Token refreshed successfully');
        return true;
      }
      console.warn('[Auth] Refresh response missing access token');
      return false;
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

export async function api(path: string, options: RequestInit = {}, _retry = false) {
  const { skipAuth = false, headers: customHeaders, ...rest } = options as any;
  let res: Response;
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
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[API] Network error on ${path}:`, errorMsg);
    throw new Error(`Network error: ${errorMsg}`);
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
          message: 'Your session has expired. Please log in again.',
          duration: 5000,
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
      message: 'Your session has expired. Please log in again.',
      duration: 5000,
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

  let data: any;
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
