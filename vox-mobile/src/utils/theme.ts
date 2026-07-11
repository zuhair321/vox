// Vox Mobile — Cyberpunk dark theme colors

export const colors = {
  // Backgrounds
  bg: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a2e',
  bgHover: '#1e1e32',

  // Panels
  panel: '#0f0f1a',
  panelLight: '#16162a',

  // Accent — electric purple/void
  accent: '#7b2fff',
  accentLight: '#9b5fff',
  accentDark: '#5a1fd6',

  // Text
  text: '#e4e4e7',
  textMuted: '#8b8b9e',
  textDim: '#5a5a70',

  // Status
  online: '#22c55e',
  idle: '#eab308',
  dnd: '#ef4444',
  offline: '#52525b',

  // Borders
  border: '#1e1e32',
  borderLight: '#2a2a42',

  // Semantic
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Roles
  founder: '#eab308',
  admin: '#ef4444',
  moderator: '#3b82f6',
  member: '#8b8b9e',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;
