// Vox Mobile — Theme Store
// Supports a set of predefined themes. Currently uses VOX's dark default.
// Light mode is available as a future toggle.

import { create } from 'zustand';
import { getItem, setItem } from '../utils/storage';

export interface ThemeDef {
  id: string;
  label: string;
  // Color palette overrides
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  text: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  border: string;
}

export const THEMES: Record<string, ThemeDef> = {
  dark: {
    id: 'dark',
    label: 'Dark',
    bg: '#0b0d11',
    bgSecondary: '#12141a',
    bgTertiary: '#1a1d25',
    text: '#e8e8f0',
    textMuted: '#8888a0',
    accent: '#6600cc',
    accentLight: '#9966ff',
    border: '#1e2130',
  },
  light: {
    id: 'light',
    label: 'Light',
    bg: '#f5f5f8',
    bgSecondary: '#ffffff',
    bgTertiary: '#eeeeff',
    text: '#0b0d11',
    textMuted: '#555570',
    accent: '#6600cc',
    accentLight: '#9966ff',
    border: '#ddddee',
  },
};

const STORAGE_KEY = 'vox_theme';
const DEFAULT_THEME = 'dark';

interface ThemeStore {
  currentId: string;
  theme: ThemeDef;
  setTheme: (id: string) => Promise<void>;
  availableThemes: ThemeDef[];
}

export const useThemeStore = create<ThemeStore>((set) => ({
  currentId: DEFAULT_THEME,
  theme: THEMES[DEFAULT_THEME],
  availableThemes: Object.values(THEMES),

  setTheme: async (id) => {
    const theme = THEMES[id] || THEMES.dark;
    set({ currentId: id, theme });
    await setItem(STORAGE_KEY, id);
  },
}));

// Load persisted theme on startup
(async () => {
  try {
    const saved = await getItem(STORAGE_KEY);
    if (saved && THEMES[saved]) {
      useThemeStore.setState({
        currentId: saved,
        theme: THEMES[saved],
      });
    }
  } catch { /* ignore */ }
})();
