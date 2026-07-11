import { create } from 'zustand';
import type { Attachment } from '../types';

interface DMMessage {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  dmId: string;
  sender: any;
  recipient: any;
  attachments?: Attachment[];
  edited?: boolean;
  deleted?: boolean;
}

interface TypingUser {
  userId: string;
  username: string;
  expiresAt: number;
}

interface DMStore {
  messages: Record<string, DMMessage[]>;
  unread: Record<string, number>;
  selectedDM: string | null;
  typing: Record<string, TypingUser[]>;

  setMessages: (dmId: string, messages: DMMessage[]) => void;
  addMessage: (message: DMMessage) => void;
  updateMessage: (message: DMMessage) => void;
  removeMessage: (dmId: string, messageId: string) => void;
  selectDM: (dmId: string | null) => void;
  markRead: (dmId: string) => void;
  setTyping: (dmId: string, userId: string, username: string, typing: boolean) => void;
  purgeExpiredTyping: () => void;
  reset: () => void;
}

export const useDMStore = create<DMStore>((set, get) => ({
  messages: {},
  unread: {},
  selectedDM: null,
  typing: {},

  setMessages: (dmId, msgs) => set(state => ({
    messages: { ...state.messages, [dmId]: msgs }
  })),

  addMessage: (message) => set(state => {
    const dmId = message.dmId;
    const msgs = state.messages[dmId] || [];
    // Deduplicate by id — the socket echo and HTTP response can race.
    if (msgs.some(m => m.id === message.id)) return state;
    // Don't count own messages as unread
    let myId = '';
    try { myId = JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || ''; } catch {}
    const isOwn = message.senderId === myId;
    const isUnread = state.selectedDM !== dmId && !isOwn;
    return {
      messages: { ...state.messages, [dmId]: [...msgs, message] },
      unread: { ...state.unread, [dmId]: isUnread ? (state.unread[dmId] || 0) + 1 : (isOwn ? (state.unread[dmId] || 0) : state.unread[dmId] || 0) }
    };
  }),

  updateMessage: (message) => set(state => {
    const dmId = message.dmId;
    const msgs = state.messages[dmId];
    if (!msgs) return state;
    return {
      messages: {
        ...state.messages,
        [dmId]: msgs.map(m => m.id === message.id ? { ...m, ...message } : m),
      },
    };
  }),

  removeMessage: (dmId, messageId) => set(state => {
    const msgs = state.messages[dmId];
    if (!msgs) return state;
    return {
      messages: {
        ...state.messages,
        [dmId]: msgs.filter(m => m.id !== messageId),
      },
    };
  }),

  selectDM: (dmId) => set({ selectedDM: dmId }),

  markRead: (dmId) => set(state => ({
    unread: { ...state.unread, [dmId]: 0 }
  })),

  setTyping: (dmId, userId, username, isTyping) => set(state => {
    const current = state.typing[dmId] || [];
    const now = Date.now();
    const alive = current.filter(t => t.expiresAt > now);
    if (isTyping) {
      const filtered = alive.filter(t => t.userId !== userId);
      return {
        typing: {
          ...state.typing,
          [dmId]: [...filtered, { userId, username, expiresAt: now + 4000 }],
        },
      };
    } else {
      return {
        typing: {
          ...state.typing,
          [dmId]: alive.filter(t => t.userId !== userId),
        },
      };
    }
  }),

  purgeExpiredTyping: () => set(state => {
    const now = Date.now();
    const updated: Record<string, TypingUser[]> = {};
    let changed = false;
    for (const [dmId, users] of Object.entries(state.typing)) {
      const alive = users.filter(t => t.expiresAt > now);
      updated[dmId] = alive;
      if (alive.length !== users.length) changed = true;
    }
    return changed ? { typing: updated } : state;
  }),

  // Tear down the prior session so the next user starts clean.
  reset: () => set({ messages: {}, unread: {}, selectedDM: null, typing: {} }),
}));
