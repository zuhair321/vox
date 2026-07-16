import { create } from 'zustand';

export interface ProfileBadge {
  id: string;
  label: string;
}

export interface ProfileConnection {
  id: string;
  platform: string;
  username: string;
  color: string;
  verified: boolean;
}

export type AuraType = 'none' | 'void' | 'crimson' | 'ocean' | 'toxic' | 'gold' | 'solar' | 'aurora';

interface ProfileStore {
  displayName: string;
  username: string;
  bio: string;
  status: string;
  userStatus: 'online' | 'idle' | 'dnd' | 'offline';
  avatarUrl: string | null;
  bannerUrl: string | null;
  auraType: AuraType;
  badges: ProfileBadge[];
  connections: ProfileConnection[];
  memberSince: string;
  orbsBalance: number;
  hasTurbo: boolean;
  updateStatus: (status: string) => void;
  updateUserStatus: (status: 'online' | 'idle' | 'dnd' | 'offline') => void;
  updateBio: (bio: string) => void;
  hydrateFromUser: (user: any) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  setBannerUrl: (bannerUrl: string | null) => void;
  setAuraType: (aura: AuraType) => void;
  reset: () => void;
}

import { api } from '../api/client';

export const useProfileStore = create<ProfileStore>((set, get) => ({
  displayName: '',
  username: '',
  bio: '',
  status: '',
  userStatus: 'online',
  avatarUrl: null,
  bannerUrl: null,
  auraType: 'none',
  badges: [],
  connections: [],
  memberSince: '',
  orbsBalance: 0,
  hasTurbo: true,
  updateStatus: (status) => set({ status }),
  updateUserStatus: async (userStatus) => {
    set({ userStatus });
    // Also broadcast via socket so other users see it immediately
    try {
      const { useSocketStore } = await import('./socketStore');
      useSocketStore.getState().updateStatus(userStatus.toUpperCase());
    } catch (err) {
      console.warn('Failed to broadcast status', err);
    }
    try {
      const res = await api('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ status: userStatus.toUpperCase() })
      });
      if (res?.user) {
        const existing = JSON.parse(localStorage.getItem('vox_user') || '{}');
        localStorage.setItem('vox_user', JSON.stringify({ ...existing, ...res.user }));
      }
    } catch (err) {
      console.warn('Failed to save status', err);
    }
  },
  updateBio: async (bio) => {
    set({ bio });
    try {
      const res = await api('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio })
      });
      if (res?.user) {
        const existing = JSON.parse(localStorage.getItem('vox_user') || '{}');
        localStorage.setItem('vox_user', JSON.stringify({ ...existing, ...res.user }));
      }
    } catch (err) {
      console.warn('Failed to save bio', err);
    }
  },
  hydrateFromUser: (user) => set((state) => ({
    displayName: user?.displayName || user?.username || state.displayName,
    username: user?.username || state.username,
    avatarUrl: user?.avatarUrl ?? state.avatarUrl,
    bannerUrl: user?.bannerUrl ?? state.bannerUrl,
    bio: user?.bio ?? state.bio,
    userStatus: user?.status ? user.status.toLowerCase() : state.userStatus,
    auraType: (user?.auraType && ['none', 'void', 'crimson', 'ocean', 'toxic', 'gold', 'solar', 'aurora'].includes(user.auraType))
      ? user.auraType
      : state.auraType,
    hasTurbo: user?.hasTurbo !== undefined ? user.hasTurbo : true,
  })),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  setBannerUrl: (bannerUrl) => set({ bannerUrl }),
  setAuraType: (auraType) => set({ auraType }),

  // Tear down the prior session so the next user starts clean. Identity,
  // badges and connections are per-user and must not bleed into the next login.
  reset: () => set({
    displayName: '',
    username: '',
    bio: '',
    status: '',
    userStatus: 'online',
    avatarUrl: null,
    bannerUrl: null,
    auraType: 'none',
    badges: [],
    connections: [],
    memberSince: '',
    orbsBalance: 0,
    hasTurbo: true,
  }),
}));
