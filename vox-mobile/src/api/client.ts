// Vox Mobile — API client with token injection and 401 refresh

import { getAccessToken, getRefreshToken, setTokens, clearTokens, getItem, setItem } from '../utils/storage';

// Default: public production API. Override via EXPO_PUBLIC_API_URL at build time
// or via the in-app Settings screen (stored under 'api_base').
const BUILD_TIME_BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const DEFAULT_BASE = BUILD_TIME_BASE || 'https://api.vox.app';
export let API_BASE = DEFAULT_BASE;

// Privacy policy URL (used in Settings + Play Console). Override at build time
// via EXPO_PUBLIC_PRIVACY_URL.
export const PRIVACY_POLICY_URL =
  (process.env.EXPO_PUBLIC_PRIVACY_URL || '').replace(/\/+$/, '') ||
  'https://api.vox.app/privacy';

let baseLoaded = false;
let loadPromise: Promise<void> | null = null;

async function loadApiBase() {
  if (baseLoaded) return;
  if (loadPromise) { await loadPromise; return; }

  loadPromise = (async () => {
    // 1. Try stored URL from Settings screen (highest priority at runtime)
    const stored = await getItem('api_base');
    if (stored) {
      API_BASE = stored;
      baseLoaded = true;
      return;
    }
    // 2. Fall back to build-time / default public URL
    API_BASE = DEFAULT_BASE;
    baseLoaded = true;
  })();

  await loadPromise;
}

export async function setApiBase(url: string) {
  const clean = url.replace(/\/+$/, '');
  API_BASE = clean;
  await setItem('api_base', clean);
}

// Kick off loading — first API call will wait for this
loadApiBase();

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.tokens?.access && data.tokens?.refresh) {
      await setTokens(data.tokens.access, data.tokens.refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function api<T = any>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  });

  // Handle 401 — try refresh once
  if (res.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken();
    }
    const refreshed = await refreshPromise;
    refreshPromise = null;

    if (refreshed) {
      // Retry original request with new token
      const newToken = await getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...rest,
          headers,
        });
        if (!retryRes.ok) {
          const errorBody = await retryRes.text();
          throw new ApiError(retryRes.status, errorBody);
        }
        return retryRes.json();
      }
    }

    // Refresh failed — clear tokens, caller should redirect to login
    await clearTokens();
    throw new ApiError(401, 'Session expired');
  }

  // Handle 429
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    throw new ApiError(429, 'Rate limited', retryAfter ? parseInt(retryAfter, 10) : undefined);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw new ApiError(res.status, errorBody);
  }

  return res.json();
}

export class ApiError extends Error {
  status: number;
  retryAfter?: number;

  constructor(status: number, body: string, retryAfter?: number) {
    super(body);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// Fire-and-forget crash reporting. Never throws — failures are silent so they
// don't cascade into another crash.
export async function reportCrash(
  message: string,
  options: { stack?: string; version?: string; platform?: string; extra?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/client/crash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack: options.stack,
        version: options.version,
        platform: options.platform,
        extra: options.extra,
      }),
    });
  } catch {
    /* ignore */
  }
}

