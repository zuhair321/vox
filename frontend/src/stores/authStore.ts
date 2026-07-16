// Vox Web — Auth store (tokens, user, login/logout)

import { create } from 'zustand';
import * as authApi from '../api/auth';
import * as storage from '../utils/auth';
import { useSocketStore } from './socketStore';

const SESSION_ACCESS_KEY = 'vox_access';
const SESSION_REFRESH_KEY = 'vox_refresh';
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
  login: (emailOrUsername: string, password: string) => Promise<{ twoFactorRequired?: boolean; tempToken?: string }>;
  completeTwoFactor: (code: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearLoginAlert: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: sessionStorage.getItem(SESSION_ACCESS_KEY),
  isLoading: false,
  isInitialized: false,
  loginAlert: null,

  initialize: async () => {
    const accessToken = sessionStorage.getItem(SESSION_ACCESS_KEY);
    const refreshToken = sessionStorage.getItem(SESSION_REFRESH_KEY);

    // If we have a token, try to validate it by fetching the current user
    if (accessToken) {
      set({ accessToken, isLoading: true });
      try {
        const { user } = await authApi.getMe();
        if (user) {
          persistUser(user);
          set({ user, accessToken, isInitialized: true, isLoading: false, loginAlert: null });
          return;
        }
      } catch {
        // Token invalid — clear it and fall through to logged-out state
        sessionStorage.removeItem(SESSION_ACCESS_KEY);
        sessionStorage.removeItem(SESSION_REFRESH_KEY);
        clearPersistedUser();
      }
    }

    // No valid token — start logged out
    set({ user: null, accessToken: null, isInitialized: true, isLoading: false, loginAlert: null });
  },

  login: async (emailOrUsername, password) => {
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
      sessionStorage.setItem(SESSION_ACCESS_KEY, authResult.tokens.access);
      sessionStorage.setItem(SESSION_REFRESH_KEY, authResult.tokens.refresh);
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
      
      set({ user: authResult.user, accessToken: authResult.tokens.access, isLoading: false });
      return {};
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  completeTwoFactor: async (code) => {
    const tempToken = sessionStorage.getItem('vox_2fa_temp_token');
    if (!tempToken) throw new Error('No 2FA temp token');

    set({ isLoading: true, loginAlert: null });
    try {
      const result = await authApi.twoFactorLogin(tempToken, code);
      sessionStorage.setItem(SESSION_ACCESS_KEY, result.tokens.access);
      sessionStorage.setItem(SESSION_REFRESH_KEY, result.tokens.refresh);
      persistUser(result.user);
      set({ user: result.user, accessToken: result.tokens.access, isLoading: false });
      sessionStorage.removeItem('vox_2fa_temp_token');
      
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

  register: async (email, username, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register(email, username, password);
      sessionStorage.setItem(SESSION_ACCESS_KEY, result.tokens.access);
      sessionStorage.setItem(SESSION_REFRESH_KEY, result.tokens.refresh);
      persistUser(result.user);
      set({ user: result.user, accessToken: result.tokens.access, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = sessionStorage.getItem(SESSION_REFRESH_KEY);
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    sessionStorage.removeItem(SESSION_ACCESS_KEY);
    sessionStorage.removeItem(SESSION_REFRESH_KEY);
    clearPersistedUser();
    storage.logout();
    set({ user: null, accessToken: null, loginAlert: null });
  },

  clearLoginAlert: () => set({ loginAlert: null }),
}));

export function getAccessToken(): string | null {
  // Check sessionStorage first (regular login)
  let accessToken = useAuthStore.getState().accessToken || sessionStorage.getItem(SESSION_ACCESS_KEY);
  
  // If no token in sessionStorage, check localStorage for "remember me" tokens
  if (!accessToken) {
    const rememberMe = localStorage.getItem('vox_remember_me') === 'true';
    if (rememberMe) {
      accessToken = localStorage.getItem('vox_access');
    }
  }
  
  return accessToken;
}
