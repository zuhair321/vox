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

interface ProfileStore {
  displayName: string;
  username: string;
  bio: string;
  status: string;
  userStatus: 'online' | 'idle' | 'dnd' | 'offline';
  avatarUrl: string | null;
  bannerUrl: string | null;
  badges: ProfileBadge[];
  connections: ProfileConnection[];
  memberSince: string;
  orbsBalance: number;
  updateStatus: (status: string) => void;
  updateUserStatus: (status: 'online' | 'idle' | 'dnd' | 'offline') => void;
  updateBio: (bio: string) => void;
  hydrateFromUser: (user: any) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  setBannerUrl: (bannerUrl: string | null) => void;
  reset: () => void;
}

import { api } from '../api/client';

export const useProfileStore = create<ProfileStore>((set, get) => ({
  displayName: 'Zuhair',
  username: 'founder_zuhair',
  bio: 'Founder channel open. Building VOX from the dark matter layer upward.',
  status: '',
  userStatus: 'online',
  avatarUrl: null,
  bannerUrl: null,
  badges: [
    { id: 'founder', label: 'FOUNDER' },
    { id: 'alpha', label: 'ALPHA' },
    { id: 'void', label: 'VOID' },
  ],
  connections: [
    { id: 'riot', platform: 'Riot', username: 'zuhair#VOX', color: '#ff4655', verified: true },
    { id: 'spotify', platform: 'Spotify', username: 'zuhair.wav', color: '#1db954', verified: true },
    { id: 'steam', platform: 'Steam', username: 'DarkMatterFounder', color: '#6b8ba4', verified: false },
  ],
  memberSince: 'June 2026',
  orbsBalance: 0,
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
  })),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  setBannerUrl: (bannerUrl) => set({ bannerUrl }),

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
    badges: [],
    connections: [],
    memberSince: '',
    orbsBalance: 0,
  }),
}));
