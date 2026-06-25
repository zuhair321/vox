import { create } from 'zustand';
import type { Attachment } from '../types';
import { useServerStore } from './serverStore';

export interface User {
  id: string;
  username: string;
  displayName?: string;
  status: string;
  role?: string;
  color?: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  body: string;
  createdAt: string;
  channelId: string;
  userId?: string;
  authorOverride?: string;
  author?: User;
  reactions?: any[];
  edited?: boolean;
  deleted?: boolean;
  pinned?: boolean;
  parentId?: string;
  parent?: Message;
  attachments?: Attachment[];
}

interface MessageStore {
  messages: Record<string, Message[]>;
  loading: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  typingUsers: Record<string, string[]>;
  replyingTo: Message | null;
  unread: Record<string, number>;
  
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setTyping: (channelId: string, username: string, isTyping: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  markRead: (channelId: string) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: {},
  loading: {},
  hasMore: {},
  typingUsers: {},
  replyingTo: null,
  unread: {},

  setMessages: (channelId, msgs) =>
    set((state) => ({
      messages: { ...state.messages, [channelId]: msgs },
    })),

  addMessage: (channelId, message) =>
    set((state) => {
      const msgs = state.messages[channelId] || [];
      if (msgs.some((item) => item.id === message.id)) {
        return state;
      }

      // Only bump the unread badge when the message lands in a channel the
      // user isn't currently viewing, and never for the user's own messages.
      // (The old code hardcoded `isUnread = true`, so the active channel and
      // your own sends inflated the unread count.)
      const activeChannelId = useServerStore.getState().selectedChannel?.id;
      let myId = '';
      try {
        myId = JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || '';
      } catch {
        myId = '';
      }
      const isMine = !!myId && (message.userId === myId || message.author?.id === myId);
      const isUnread = channelId !== activeChannelId && !isMine;

      return {
        messages: { ...state.messages, [channelId]: [...msgs, message] },
        unread: {
          ...state.unread,
          [channelId]: isUnread
            ? (state.unread[channelId] || 0) + 1
            : (state.unread[channelId] || 0),
        },
      };
    }),

  updateMessage: (channelId, message) =>
    set((state) => {
      const msgs = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: msgs.map((m) => (m.id === message.id ? message : m)),
        },
      };
    }),

  removeMessage: (channelId, messageId) =>
    set((state) => {
      const msgs = state.messages[channelId] || [];
      return {
        messages: {
          ...state.messages,
          [channelId]: msgs.filter((m) => m.id !== messageId),
        },
      };
    }),

  setTyping: (channelId, username, isTyping) =>
    set((state) => {
      const users = state.typingUsers[channelId] || [];
      if (isTyping && !users.includes(username)) {
        return { typingUsers: { ...state.typingUsers, [channelId]: [...users, username] } };
      } else if (!isTyping && users.includes(username)) {
        return { typingUsers: { ...state.typingUsers, [channelId]: users.filter((u) => u !== username) } };
      }
      return state;
    }),

  setReplyingTo: (message) => set({ replyingTo: message }),

  markRead: (channelId) =>
    set((state) => ({ unread: { ...state.unread, [channelId]: 0 } }))
}));
