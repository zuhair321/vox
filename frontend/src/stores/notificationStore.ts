import { create } from 'zustand';

export type NotificationType = 'mention' | 'dm' | 'join' | 'system' | 'warning' | 'error';

export interface Notification {
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
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function loadPersisted(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr: Notification[] = JSON.parse(raw);
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return arr
      .filter((n) => new Date(n.createdAt).getTime() > cutoff)
      .slice(-MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

function persist(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage full or unavailable — silently degrade.
  }
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  filter: 'all' | 'mentions' | 'unreads';

  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setFilter: (filter: 'all' | 'mentions' | 'unreads') => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: loadPersisted(),
  unreadCount: loadPersisted().filter((n) => !n.read).length,
  isOpen: false,
  filter: 'all',

  addNotification: (data) => {
    set((state) => {
      const notification: Notification = {
        ...data,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      const unreadCount = notifications.filter((n) => !n.read).length;
      persist(notifications);
      return { notifications, unreadCount };
    });

    // Trigger Electron native notification if the page is hidden.
    const n = get().notifications[0];
    if (n && document.hidden) {
      try {
        (window as any).electronAPI?.notify?.('VOX', n.title);
      } catch {
        // Not in Electron — no-op.
      }
    }
  },

  markRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      persist(notifications);
      return { notifications, unreadCount };
    });
  },

  markAllRead: () => {
    set((state) => {
      const notifications = state.notifications.map((n) => ({ ...n, read: true }));
      persist(notifications);
      return { notifications, unreadCount: 0 };
    });
  },

  clearAll: () => {
    persist([]);
    set({ notifications: [], unreadCount: 0 });
  },

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  setFilter: (filter) => set({ filter }),
}));
