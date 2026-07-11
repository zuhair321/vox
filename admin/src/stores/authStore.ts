import { create } from 'zustand';
import { authApi } from '../api/admin';
import { api } from '../api/client';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('vox_admin_token'),
  loading: true,
  error: null,

  login: async (emailOrUsername, password) => {
    set({ loading: true, error: null });
    try {
      const { user, tokens } = await authApi.login(emailOrUsername, password);
      if (user.role !== 'ADMIN' && user.role !== 'FOUNDER') {
        throw new Error('Access denied. Admin privileges required.');
      }
      const accessToken = tokens.access;
      const refreshToken = tokens.refresh;
      localStorage.setItem('vox_admin_token', accessToken);
      localStorage.setItem('vox_admin_refresh', refreshToken);
      api.setToken(accessToken);
      set({ user, token: accessToken, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('vox_admin_token');
    localStorage.removeItem('vox_admin_refresh');
    api.setToken(null);
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('vox_admin_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    api.setToken(token);
    try {
      const { user } = await authApi.me();
      if (user.role !== 'ADMIN' && user.role !== 'FOUNDER') {
        throw new Error('Access denied');
      }
      set({ user, token, loading: false });
    } catch {
      const refresh = localStorage.getItem('vox_admin_refresh');
      if (refresh) {
        try {
          const { tokens } = await authApi.refresh(refresh);
          const accessToken = tokens.access;
          const refreshToken = tokens.refresh;
          localStorage.setItem('vox_admin_token', accessToken);
          localStorage.setItem('vox_admin_refresh', refreshToken);
          api.setToken(accessToken);
          const { user } = await authApi.me();
          set({ user, token: accessToken, loading: false });
          return;
        } catch {}
      }
      localStorage.removeItem('vox_admin_token');
      localStorage.removeItem('vox_admin_refresh');
      api.setToken(null);
      set({ user: null, token: null, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
