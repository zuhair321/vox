// Vox Mobile — Auth store (tokens, user, login/logout)

import { create } from 'zustand';
import * as authApi from '../api/auth';
import * as storage from '../utils/storage';
import type { User, Tokens } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  twoFactorTempToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<{ twoFactorRequired?: boolean }>;
  completeTwoFactor: (code: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: { displayName?: string; bio?: string; status?: string }) => Promise<void>;
  setTwoFactorTempToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  twoFactorTempToken: null,

  initialize: async () => {
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        set({ isInitialized: true });
        return;
      }

      const { user } = await authApi.getMe();
      set({ user, isInitialized: true });
    } catch {
      // Token expired or invalid — try refresh
      const refreshTokenValue = await storage.getRefreshToken();
      if (refreshTokenValue) {
        try {
          const data = await authApi.refreshToken(refreshTokenValue);
          await storage.setTokens(data.tokens.access, data.tokens.refresh);
          set({ user: data.user, isInitialized: true });
          return;
        } catch {
          await storage.clearTokens();
        }
      }
      set({ isInitialized: true });
    }
  },

  login: async (emailOrUsername, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login(emailOrUsername, password);

      if ('twoFactorRequired' in result) {
        set({ twoFactorTempToken: result.tempToken, isLoading: false });
        return { twoFactorRequired: true };
      }

      await storage.setTokens(result.tokens.access, result.tokens.refresh);
      await storage.setUserData(JSON.stringify(result.user));
      set({ user: result.user, isLoading: false, twoFactorTempToken: null });
      return {};
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  completeTwoFactor: async (code) => {
    const { twoFactorTempToken } = get();
    if (!twoFactorTempToken) throw new Error('No 2FA temp token');

    set({ isLoading: true });
    try {
      const result = await authApi.twoFactorLogin(twoFactorTempToken, code);
      await storage.setTokens(result.tokens.access, result.tokens.refresh);
      await storage.setUserData(JSON.stringify(result.user));
      set({ user: result.user, isLoading: false, twoFactorTempToken: null });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register(email, username, password);
      await storage.setTokens(result.tokens.access, result.tokens.refresh);
      await storage.setUserData(JSON.stringify(result.user));
      set({ user: result.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const refreshTokenValue = await storage.getRefreshToken();
    if (refreshTokenValue) {
      try { await authApi.logout(refreshTokenValue); } catch { /* ignore */ }
    }
    await storage.clearTokens();
    set({ user: null, twoFactorTempToken: null });
  },

  refreshUser: async () => {
    try {
      const { user } = await authApi.getMe();
      set({ user });
      await storage.setUserData(JSON.stringify(user));
    } catch { /* ignore */ }
  },

  updateUser: async (data) => {
    const { user } = await authApi.updateMe(data);
    set({ user });
    await storage.setUserData(JSON.stringify(user));
  },

  setTwoFactorTempToken: (token) => set({ twoFactorTempToken: token }),
}));
