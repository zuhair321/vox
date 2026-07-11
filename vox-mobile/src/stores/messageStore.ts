// Vox Mobile — Message store

import { create } from 'zustand';
import * as messagesApi from '../api/messages';
import type { Message } from '../types';

interface MessageState {
  messages: Record<string, Message[]>;
  loading: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  typingUsers: Record<string, string[]>;
  replyingTo: Message | null;
  unread: Record<string, number>;

  // Actions
  fetchMessages: (channelId: string, before?: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setTyping: (channelId: string, username: string, isTyping: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  markRead: (channelId: string) => void;
  incrementUnread: (channelId: string) => void;
  reset: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  loading: {},
  hasMore: {},
  typingUsers: {},
  replyingTo: null,
  unread: {},

  fetchMessages: async (channelId, before) => {
    set(state => ({ loading: { ...state.loading, [channelId]: true } }));
    try {
      const newMessages = await messagesApi.fetchMessages(channelId, before);
      set(state => {
        const existing = state.messages[channelId] || [];
        const merged = before
          ? [...newMessages, ...existing] // older messages prepend
          : newMessages;

        // Dedup
        const seen = new Set<string>();
        const deduped = merged.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

        return {
          messages: { ...state.messages, [channelId]: deduped },
          hasMore: { ...state.hasMore, [channelId]: newMessages.length >= 50 },
          loading: { ...state.loading, [channelId]: false },
        };
      });
    } catch {
      set(state => ({ loading: { ...state.loading, [channelId]: false } }));
    }
  },

  addMessage: (channelId, message) => {
    set(state => {
      const existing = state.messages[channelId] || [];
      if (existing.some(m => m.id === message.id)) return state;

      return {
        messages: { ...state.messages, [channelId]: [...existing, message] },
      };
    });
  },

  updateMessage: (channelId, message) => {
    set(state => {
      const existing = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: existing.map(m => (m.id === message.id ? { ...m, ...message } : m)),
        },
      };
    });
  },

  removeMessage: (channelId, messageId) => {
    set(state => {
      const existing = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: existing.map(m =>
            m.id === messageId ? { ...m, deleted: true, body: '*This message was deleted*' } : m
          ),
        },
      };
    });
  },

  setTyping: (channelId, username, isTyping) => {
    set(state => {
      const current = state.typingUsers[channelId] || [];
      let updated: string[];
      if (isTyping) {
        updated = current.includes(username) ? current : [...current, username];
      } else {
        updated = current.filter(u => u !== username);
      }
      return { typingUsers: { ...state.typingUsers, [channelId]: updated } };
    });
  },

  setReplyingTo: (message) => set({ replyingTo: message }),

  markRead: (channelId) => {
    set(state => ({ unread: { ...state.unread, [channelId]: 0 } }));
  },

  incrementUnread: (channelId) => {
    set(state => ({
      unread: { ...state.unread, [channelId]: (state.unread[channelId] || 0) + 1 },
    }));
  },

  reset: () => set({ messages: {}, loading: {}, hasMore: {}, typingUsers: {}, replyingTo: null, unread: {} }),
}));
