import { create } from 'zustand';
import * as api from '../api/groupDm';
import type { GroupDm, GroupDmMessage } from '../api/groupDm';

interface GroupDmState {
  groupDms: GroupDm[];
  currentGroupDm: GroupDm | null;
  messages: GroupDmMessage[];
  isLoading: boolean;
  
  fetchGroupDms: () => Promise<void>;
  selectGroupDm: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  fetchMessages: (before?: string) => Promise<void>;
  addMessage: (message: GroupDmMessage) => void;
  clearCurrent: () => void;
}

export const useGroupDmStore = create<GroupDmState>((set, get) => ({
  groupDms: [],
  currentGroupDm: null,
  messages: [],
  isLoading: false,
  
  fetchGroupDms: async () => {
    set({ isLoading: true });
    try {
      const { groupDms } = await api.listGroupDms();
      set({ groupDms, isLoading: false });
    } catch { set({ isLoading: false }); }
  },
  
  selectGroupDm: async (id: string) => {
    set({ isLoading: true });
    try {
      const { groupDm } = await api.getGroupDm(id);
      const { messages } = await api.getGroupDmMessages(id);
      set({ currentGroupDm: groupDm, messages, isLoading: false });
    } catch { set({ isLoading: false }); }
  },
  
  sendMessage: async (content: string) => {
    const { currentGroupDm } = get();
    if (!currentGroupDm) return;
    const { message } = await api.sendGroupDmMessage(currentGroupDm.id, content);
    set((s) => ({ messages: [...s.messages, message] }));
  },
  
  fetchMessages: async (before?: string) => {
    const { currentGroupDm, messages } = get();
    if (!currentGroupDm) return;
    const { messages: newMessages } = await api.getGroupDmMessages(currentGroupDm.id, before);
    set({ messages: [...newMessages, ...messages] });
  },
  
  addMessage: (message: GroupDmMessage) => {
    set((s) => ({ messages: [...s.messages, message] }));
  },
  
  clearCurrent: () => set({ currentGroupDm: null, messages: [] }),
}));
