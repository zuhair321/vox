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
}

interface DMStore {
  messages: Record<string, DMMessage[]>;
  unread: Record<string, number>;
  selectedDM: string | null;

  setMessages: (dmId: string, messages: DMMessage[]) => void;
  addMessage: (message: DMMessage) => void;
  selectDM: (dmId: string) => void;
  markRead: (dmId: string) => void;
}

export const useDMStore = create<DMStore>((set, get) => ({
  messages: {},
  unread: {},
  selectedDM: null,

  setMessages: (dmId, msgs) => set(state => ({
    messages: { ...state.messages, [dmId]: msgs }
  })),

  addMessage: (message) => set(state => {
    const dmId = message.dmId;
    const msgs = state.messages[dmId] || [];
    const isUnread = state.selectedDM !== dmId;
    return {
      messages: { ...state.messages, [dmId]: [...msgs, message] },
      unread: { ...state.unread, [dmId]: isUnread ? (state.unread[dmId] || 0) + 1 : 0 }
    };
  }),

  selectDM: (dmId) => set({ selectedDM: dmId }),

  markRead: (dmId) => set(state => ({
    unread: { ...state.unread, [dmId]: 0 }
  }))
}));
