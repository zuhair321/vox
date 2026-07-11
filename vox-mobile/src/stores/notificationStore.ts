// Vox Mobile — Notification Store

import { create } from 'zustand';
import { getItem, setItem } from '../utils/storage';

export type NotificationType = 'mention' | 'dm' | 'join' | 'system' | 'warning' | 'error';

export interface VoxNotification {
  id: string;
  type: NotificationType;
  title: string;
  preview?: string;
  channelId?: string;
  serverId?: string;
  messageId?: string;
  userId?: string;
  read: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'vox_notifications';
const MAX_NOTIFICATIONS = 100;

async function loadPersisted(): Promise<VoxNotification[]> {
  try {
    const raw = await getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

async function persist(notifications: VoxNotification[]) {
  try {
    await setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch { /* ignore */ }
}

interface NotificationStore {
  notifications: VoxNotification[];
  unreadCount: number;
  filter: 'all' | 'mentions' | 'unreads';
  isLoading: boolean;

  init: () => Promise<void>;
  addNotification: (data: Omit<VoxNotification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  setFilter: (filter: 'all' | 'mentions' | 'unreads') => void;
  getFiltered: () => VoxNotification[];
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  filter: 'all',
  isLoading: true,

  init: async () => {
    const notifications = await loadPersisted();
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      isLoading: false,
    });
  },

  addNotification: (data) => {
    const notification: VoxNotification = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      const unreadCount = notifications.filter(n => !n.read).length;
      persist(notifications);
      return { notifications, unreadCount };
    });
  },

  markRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n,
      );
      const unreadCount = notifications.filter(n => !n.read).length;
      persist(notifications);
      return { notifications, unreadCount };
    });
  },

  markAllRead: () => {
    set((state) => {
      const notifications = state.notifications.map(n => ({ ...n, read: true }));
      persist(notifications);
      return { notifications, unreadCount: 0 };
    });
  },

  clearAll: () => {
    persist([]);
    set({ notifications: [], unreadCount: 0 });
  },

  setFilter: (filter) => set({ filter }),

  getFiltered: () => {
    const { notifications, filter } = get();
    switch (filter) {
      case 'mentions': return notifications.filter(n => n.type === 'mention');
      case 'unreads': return notifications.filter(n => !n.read);
      default: return notifications;
    }
  },
}));
