import { create } from 'zustand';

export interface ThemeDef {
  id: string;
  label: string; // display label under swatch
  swatchBg: string; // primary background of the swatch preview
  swatchAccent: string; // accent of the swatch preview
}

// The 8 VOX themes. `id` matches the [data-theme="<id>"] selectors in themes.css.
export const THEMES: ThemeDef[] = [
  { id: 'void', label: 'Void', swatchBg: '#00000a', swatchAccent: '#6600cc' },
  { id: 'crimson-blood', label: 'Crimson', swatchBg: '#0a0000', swatchAccent: '#cc0000' },
  { id: 'ocean-abyss', label: 'Ocean', swatchBg: '#000a0f', swatchAccent: '#0066cc' },
  { id: 'toxic-matrix', label: 'Matrix', swatchBg: '#000a00', swatchAccent: '#00cc44' },
  { id: 'gold-sovereign', label: 'Gold', swatchBg: '#0a0800', swatchAccent: '#cc9900' },
  { id: 'specter-gray', label: 'Specter', swatchBg: '#050505', swatchAccent: '#888888' },
  { id: 'sunset-inferno', label: 'Inferno', swatchBg: '#0a0400', swatchAccent: '#cc4400' },
  { id: 'midnight-cherry', label: 'Cherry', swatchBg: '#0a0008', swatchAccent: '#cc0066' },
];

const STORAGE_KEY = 'vox_theme';
const DEFAULT_THEME = 'void';

function applyTheme(id: string) {
  document.documentElement.setAttribute('data-theme', id);
}

// Initialize from localStorage at module load so the right theme paints before
// React mounts (avoids a flash of the wrong theme).
const savedTheme = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
})();
applyTheme(savedTheme);

interface ThemeStore {
  current: string;
  themes: ThemeDef[];
  setTheme: (id: string) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  current: savedTheme,
  themes: THEMES,
  setTheme: (id) => {
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* localStorage may be unavailable (SSR / privacy mode) — ignore */
    }
    set({ current: id });
  },
}));
