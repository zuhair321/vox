import { create } from 'zustand';
import { fetchDmPreferences, updateDmPreferences, type DmPreferences } from '../api/dm';

export interface DmPrefState {
  /** dmId -> preferences */
  prefs: Record<string, DmPreferences>;
  fetchPrefs: (dmId: string) => Promise<void>;
  updatePrefs: (dmId: string, patch: Partial<DmPreferences>) => Promise<void>;
  isMuted: (dmId: string) => boolean;
  getPrefs: (dmId: string) => DmPreferences;
}

const DEFAULT_PREFS: DmPreferences = {
  muted: false,
  mutedUntil: null,
  showAvatar: true,
  showDisplayName: true,
};

export const useDmPrefStore = create<DmPrefState>((set, get) => ({
  prefs: {},

  fetchPrefs: async (dmId: string) => {
    try {
      const prefs = await fetchDmPreferences(dmId);
      set((s) => ({ prefs: { ...s.prefs, [dmId]: prefs } }));
    } catch {
      // Silently fall back to defaults
    }
  },

  updatePrefs: async (dmId: string, patch: Partial<DmPreferences>) => {
    const prev = get().prefs[dmId] || DEFAULT_PREFS;
    const next = { ...prev, ...patch };
    set((s) => ({ prefs: { ...s.prefs, [dmId]: next } }));
    try {
      await updateDmPreferences(dmId, patch);
    } catch {
      set((s) => ({ prefs: { ...s.prefs, [dmId]: prev } }));
    }
  },

  isMuted: (dmId: string) => {
    const p = get().prefs[dmId];
    if (!p) return false;
    if (!p.muted) return false;
    if (p.mutedUntil && new Date(p.mutedUntil) < new Date()) return false;
    return true;
  },

  getPrefs: (dmId: string) => get().prefs[dmId] || DEFAULT_PREFS,
}));
