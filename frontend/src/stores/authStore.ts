// Vox Web — Auth store (user, login/logout)
//
// SECURITY: access/refresh tokens live ONLY in HttpOnly cookies set by the
// backend (see backend/src/services/auth.service.js#setAuthCookies). They are
// NEVER written to sessionStorage/localStorage, so an XSS bug cannot read a
// live token. The `api()` client sends the cookie automatically via
// `credentials: 'include'`. Only the non-secret `vox_user` profile is cached
// in localStorage so the UI can render instantly on reload.

import { create } from 'zustand';
import * as authApi from '../api/auth';
import * as storage from '../utils/auth';
import { startProactiveRefresh, stopProactiveRefresh } from '../api/client';
import { useSocketStore } from './socketStore';

const LOCAL_USER_KEY = 'vox_user';

// The canonical "current user" is persisted to localStorage under `vox_user`
// and mirrored into the profile store. Most of the app (messages, mentions,
// member panels, settings) reads identity from `vox_user`, so it MUST be
// written on every auth event — not just when the user edits their profile.
function persistUser(user: any) {
  if (!user) return;
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
  // Lazy import avoids a circular dependency (authStore → profileStore → … → authStore).
  import('./profileStore')
    .then(({ useProfileStore }) => {
      useProfileStore.getState().hydrateFromUser(user);
    })
    .catch(() => {});
}

function clearPersistedUser() {
  try {
    localStorage.removeItem(LOCAL_USER_KEY);
  } catch {
    /* ignore */
  }
  import('./profileStore')
    .then(({ useProfileStore }) => {
      useProfileStore.getState().reset();
    })
    .catch(() => {});
}

interface AuthState {
  user: any;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  loginAlert: { isNewLogin: boolean; alertMessage: string | null } | null;

  initialize: () => Promise<void>;
  login: (emailOrUsername: string, password: string, rememberMe?: boolean) => Promise<{ twoFactorRequired?: boolean; tempToken?: string }>;
  completeTwoFactor: (code: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearLoginAlert: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null, // tokens themselves live in HttpOnly cookies, not here
  isLoading: false,
  isInitialized: false,
  loginAlert: null,

  initialize: async () => {
    set({ isInitialized: true, isLoading: true, loginAlert: null });

    // Restore the current user optimistically from the cached profile so a
    // valid session never bounces to login while the API is briefly
    // unreachable (e.g. the Electron backend is still booting). We re-validate
    // in the background and fall back to login on a genuine auth failure.
    let restoredUser: any = null;
    try {
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      if (raw) restoredUser = JSON.parse(raw);
    } catch {
      /* ignore corrupt cache */
    }
    set({ user: restoredUser, isLoading: true });

    // The HttpOnly cookie carries auth. getMe() hits /api/auth/me which the
    // backend authenticates from the cookie. If the access cookie is expired,
    // api() transparently refreshes it via the refresh cookie.
    //
    // IMPORTANT: a transient failure (5xx while the bundled Postgres is still
    // booting, or a network blip) must NOT wipe a valid session — that was the
    // root cause of the recurring "session expired" forced logouts. Only a
    // genuine 401 (refresh cookie gone/revoked) means "sign in again". For
    // anything else we keep the restored user and retry with backoff, and if
    // the backend is still down we stay on the cached profile (offline) rather
    // than dumping the user to the login screen.
    const MAX_TRIES = 3;
    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        const { user } = await authApi.getMe();
        if (user) {
          persistUser(user);
          set({ user, isLoading: false });
          // Keep the access token warm so we never hit a 401 retry path on a
          // busy app. Safe under React StrictMode double-mount.
          startProactiveRefresh();
          return;
        }
      } catch (e: any) {
        const status = (e as { status?: number })?.status;
        // Genuine auth failure — the refresh cookie is gone. Sign in again.
        if (status === 401) break;
        // Transient (503/500/network) — wait and retry a few times. The
        // backend can still be connecting to Postgres at cold boot.
        if (attempt < MAX_TRIES) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        // Exhausted retries: keep the cached session instead of logging out.
        console.warn('[auth] backend unreachable, keeping cached session', status || e?.message);
        stopProactiveRefresh();
        set({ isLoading: false });
        return;
      }
    }

    clearPersistedUser();
    stopProactiveRefresh();
    set({ user: null, accessToken: null, isLoading: false, loginAlert: null });
  },

  login: async (emailOrUsername, password, rememberMe = false) => {
    set({ isLoading: true, loginAlert: null });
    try {
      const result = await authApi.login(emailOrUsername, password);

      if ((result as any).twoFactorRequired) {
        const tempToken = (result as any).tempToken;
        sessionStorage.setItem('vox_2fa_temp_token', tempToken);
        set({ isLoading: false });
        return { twoFactorRequired: true, tempToken };
      }

      const authResult = result as any;
      persistUser(authResult.user);

      if (authResult.loginAlert?.isNewLogin && authResult.loginAlert.alertMessage) {
        set({ loginAlert: authResult.loginAlert });
        if (typeof window !== 'undefined' && (window as any).electronAPI?.notify) {
          (window as any).electronAPI.notify(
            'New Login Detected',
            authResult.loginAlert.alertMessage
          );
        }
      }

      set({ user: authResult.user, accessToken: authResult.tokens?.access || null, isLoading: false });
      // Start refreshing the access token on a 25m cadence so the SPA
      // never crosses an expiry boundary.
      startProactiveRefresh();
      return {};
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  completeTwoFactor: async (code, rememberMe = false) => {
    const tempToken = sessionStorage.getItem('vox_2fa_temp_token');
    if (!tempToken) throw new Error('No 2FA temp token');

    set({ isLoading: true, loginAlert: null });
    try {
      const result = await authApi.twoFactorLogin(tempToken, code);
      persistUser(result.user);
      set({ user: result.user, accessToken: result.tokens?.access || null, isLoading: false });
      sessionStorage.removeItem('vox_2fa_temp_token');
      startProactiveRefresh();

      if (result.loginAlert?.isNewLogin && result.loginAlert.alertMessage) {
        set({ loginAlert: result.loginAlert });
        if (typeof window !== 'undefined' && (window as any).electronAPI?.notify) {
          (window as any).electronAPI.notify(
            'New Login Detected',
            result.loginAlert.alertMessage
          );
        }
      }
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, username, password, rememberMe = false) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register(email, username, password);
      persistUser(result.user);
      set({ user: result.user, accessToken: result.tokens?.access || null, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    // Logout is cookie-based: the backend clears the HttpOnly cookies and
    // revokes the refresh token server-side. No client-side token needed.
    try { await authApi.logout(); } catch { /* ignore */ }
    clearPersistedUser();
    storage.logout();
    // Cancel the proactive refresh — we're no longer authed.
    stopProactiveRefresh();
    set({ user: null, accessToken: null, loginAlert: null });
  },

  clearLoginAlert: () => set({ loginAlert: null }),
}));

export function getAccessToken(): string | null {
  // Tokens are not held in JS — auth is cookie-based. Returning null keeps any
  // legacy callers harmless; the cookie is what authenticates requests.
  return null;
}
