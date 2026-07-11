// Vox Mobile — DM store

import { create } from 'zustand';
import * as dmApi from '../api/dm';
import type { DMMessage } from '../types';

interface TypingUser {
  userId: string;
  username: string;
  expiresAt: number;
}

interface DMState {
  messages: Record<string, DMMessage[]>;
  unread: Record<string, number>;
  selectedDM: string | null;
  typing: Record<string, TypingUser[]>;
  isLoading: boolean;

  // Actions
  fetchMessages: (dmId: string) => Promise<void>;
  addMessage: (message: DMMessage) => void;
  updateMessage: (message: DMMessage) => void;
  removeMessage: (dmId: string, messageId: string) => void;
  setSelectedDM: (dmId: string | null) => void;
  setTyping: (dmId: string, userId: string, username: string, isTyping: boolean) => void;
  markRead: (dmId: string) => void;
  incrementUnread: (dmId: string) => void;
  purgeExpiredTyping: () => void;
  reset: () => void;
}

export const useDMStore = create<DMState>((set, get) => ({
  messages: {},
  unread: {},
  selectedDM: null,
  typing: {},
  isLoading: false,

  fetchMessages: async (dmId) => {
    set({ isLoading: true });
    try {
      const msgs = await dmApi.fetchDMMessages(dmId);
      set(state => ({
        messages: { ...state.messages, [dmId]: msgs },
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  addMessage: (message) => {
    const dmId = message.dmId;
    set(state => {
      const existing = state.messages[dmId] || [];
      if (existing.some(m => m.id === message.id)) return state;
      return {
        messages: { ...state.messages, [dmId]: [...existing, message] },
      };
    });
  },

  updateMessage: (message) => {
    const dmId = message.dmId;
    set(state => {
      const existing = state.messages[dmId] || [];
      return {
        messages: {
          ...state.messages,
          [dmId]: existing.map(m => (m.id === message.id ? { ...m, ...message } : m)),
        },
      };
    });
  },

  removeMessage: (dmId, messageId) => {
    set(state => {
      const existing = state.messages[dmId] || [];
      return {
        messages: {
          ...state.messages,
          [dmId]: existing.map(m =>
            m.id === messageId ? { ...m, deleted: true, content: '*This message was deleted*' } : m
          ),
        },
      };
    });
  },

  setSelectedDM: (dmId) => set({ selectedDM: dmId }),

  setTyping: (dmId, userId, username, isTyping) => {
    set(state => {
      const current = state.typing[dmId] || [];
      let updated: TypingUser[];
      if (isTyping) {
        const filtered = current.filter(t => t.userId !== userId);
        updated = [...filtered, { userId, username, expiresAt: Date.now() + 4000 }];
      } else {
        updated = current.filter(t => t.userId !== userId);
      }
      return { typing: { ...state.typing, [dmId]: updated } };
    });
  },

  markRead: (dmId) => {
    set(state => ({ unread: { ...state.unread, [dmId]: 0 } }));
  },

  incrementUnread: (dmId) => {
    set(state => ({
      unread: { ...state.unread, [dmId]: (state.unread[dmId] || 0) + 1 },
    }));
  },

  purgeExpiredTyping: () => {
    const now = Date.now();
    set(state => {
      const updated: Record<string, TypingUser[]> = {};
      for (const [dmId, users] of Object.entries(state.typing)) {
        updated[dmId] = users.filter(t => t.expiresAt > now);
      }
      return { typing: updated };
    });
  },

  reset: () => set({ messages: {}, unread: {}, selectedDM: null, typing: {}, isLoading: false }),
}));
