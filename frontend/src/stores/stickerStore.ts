import { create } from 'zustand';
import * as api from '../api/stickers';
import type { Sticker } from '../api/stickers';

interface StickerState {
  globalStickers: Sticker[];
  serverStickers: Sticker[];
  searchResults: Sticker[];
  isLoading: boolean;
  searchQuery: string;
  
  fetchGlobalStickers: () => Promise<void>;
  fetchServerStickers: (serverId: string) => Promise<void>;
  search: (query: string, serverId?: string) => Promise<void>;
  clearSearch: () => void;
}

export const useStickerStore = create<StickerState>((set) => ({
  globalStickers: [],
  serverStickers: [],
  searchResults: [],
  isLoading: false,
  searchQuery: '',
  
  fetchGlobalStickers: async () => {
    set({ isLoading: true });
    try {
      const { stickers } = await api.getGlobalStickers();
      set({ globalStickers: stickers, isLoading: false });
    } catch { set({ isLoading: false }); }
  },
  
  fetchServerStickers: async (serverId: string) => {
    set({ isLoading: true });
    try {
      const { stickers } = await api.getServerStickers(serverId);
      set({ serverStickers: stickers, isLoading: false });
    } catch { set({ isLoading: false }); }
  },
  
  search: async (query: string, serverId?: string) => {
    set({ searchQuery: query, isLoading: true });
    try {
      const { stickers } = await api.searchStickers(query, serverId);
      set({ searchResults: stickers, isLoading: false });
    } catch { set({ isLoading: false }); }
  },
  
  clearSearch: () => set({ searchResults: [], searchQuery: '' }),
}));
