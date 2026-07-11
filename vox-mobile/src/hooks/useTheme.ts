// Vox Mobile — Theme hook

import { useUIStore } from '../stores/uiStore';
import { colors } from '../utils/theme';

export function useTheme() {
  const theme = useUIStore(s => s.theme);

  // For now, return the void theme colors
  // In the future, we could support multiple themes
  return {
    theme,
    colors,
    isDark: true, // Vox is always dark
  };
}
