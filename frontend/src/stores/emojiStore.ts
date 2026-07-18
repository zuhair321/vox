import { create } from 'zustand';
import { fetchServerEmojis } from '../api/emoji';

interface EmojiEntry {
  name: string;
  url: string;
}

interface EmojiState {
  // serverId -> map of shortcode name -> emoji url (image, may be animated gif)
  byServer: Record<string, Record<string, string>>;
  loading: Record<string, boolean>;
  loadServerEmojis: (serverId: string) => Promise<void>;
  getEmojiUrl: (serverId: string | undefined, name: string) => string | null;
}

export const useEmojiStore = create<EmojiState>((set, get) => ({
  byServer: {},
  loading: {},

  loadServerEmojis: async (serverId: string) => {
    if (!serverId) return;
    if (get().byServer[serverId] || get().loading[serverId]) return;
    set((s) => ({ loading: { ...s.loading, [serverId]: true } }));
    try {
      const emojis = await fetchServerEmojis(serverId);
      const map: Record<string, string> = {};
      (emojis || []).forEach((e: EmojiEntry) => {
        if (e?.name && e?.url) map[e.name.toLowerCase()] = e.url;
      });
      set((s) => ({ byServer: { ...s.byServer, [serverId]: map } }));
    } catch {
      // leave empty so a later retry can happen
    } finally {
      set((s) => ({ loading: { ...s.loading, [serverId]: false } }));
    }
  },

  getEmojiUrl: (serverId, name) => {
    if (!serverId) return null;
    const map = get().byServer[serverId];
    if (!map) return null;
    return map[name.toLowerCase()] || null;
  },
}));
