// Vox Web — Auth store (tokens, user, login/logout)

import { create } from 'zustand';
import * as authApi from '../api/auth';
import * as storage from '../utils/auth';
import { useSocketStore } from './socketStore';

const SESSION_ACCESS_KEY = 'vox_access';
const SESSION_REFRESH_KEY = 'vox_refresh';

interface AuthState {
  user: any;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<{ twoFactorRequired?: boolean; tempToken?: string }>;
  completeTwoFactor: (code: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: sessionStorage.getItem(SESSION_ACCESS_KEY),
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { user } = await authApi.getMe();
      set({ user, isInitialized: true, isLoading: false });
    } catch {
      set({ isInitialized: true, isLoading: false, user: null, accessToken: null });
    }
  },

  login: async (emailOrUsername, password) => {
    set({ isLoading: true });
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

    set({ isLoading: true });
    try {
      const result = await authApi.twoFactorLogin(tempToken, code);
      sessionStorage.setItem(SESSION_ACCESS_KEY, result.tokens.access);
      sessionStorage.setItem(SESSION_REFRESH_KEY, result.tokens.refresh);
      set({ user: result.user, accessToken: result.tokens.access, isLoading: false });
      sessionStorage.removeItem('vox_2fa_temp_token');
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
    storage.logout();
    set({ user: null, accessToken: null });
  },
}));

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken || sessionStorage.getItem(SESSION_ACCESS_KEY);
}
