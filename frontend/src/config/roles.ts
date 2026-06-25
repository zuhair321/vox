// VOX — Role hierarchy and colors.
//
// Single source of truth for role metadata. Drives username coloring, badges,
// member-list grouping, and profile popups. Colors are applied via inline style
// (text-shadow glow) so they survive theme switches without per-role CSS rules.

export type RoleKey = 'OWNER' | 'FOUNDER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface RoleDef {
  label: string;
  color: string;
  glow: string; // rgba string for text-shadow; 'none' = no glow
  priority: number; // higher = sorted first
  badge: string | null; // emoji, or null for plain members
}

export const ROLES: Record<RoleKey, RoleDef> = {
  OWNER: {
    label: 'OWNER',
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.3)',
    priority: 100,
    badge: '👑',
  },
  FOUNDER: {
    label: 'FOUNDER',
    color: '#ffd700',
    glow: 'rgba(255,215,0,0.25)',
    priority: 95,
    badge: '⚡',
  },
  ADMIN: {
    label: 'ADMIN',
    color: '#cc0000',
    glow: 'rgba(204,0,0,0.3)',
    priority: 80,
    badge: '🔴',
  },
  MODERATOR: {
    label: 'MOD',
    color: '#6600cc',
    glow: 'rgba(102,0,204,0.3)',
    priority: 60,
    badge: '🛡',
  },
  MEMBER: {
    label: 'MEMBER',
    color: '#c8c8ff',
    glow: 'none',
    priority: 10,
    badge: null,
  },
};

// Ordered grouping for the member list: highest priority first, OFFLINE last.
export const ROLE_GROUP_ORDER: (RoleKey | 'OFFLINE')[] = [
  'OWNER',
  'FOUNDER',
  'ADMIN',
  'MODERATOR',
  'MEMBER',
  'OFFLINE',
];

// Normalize any incoming role string (DB enum, lowercase, etc.) to a RoleKey.
// Unknown values fall back to MEMBER so we never render undefined.
export function normalizeRole(role: unknown): RoleKey {
  const upper = String(role || '').toUpperCase();
  if (upper in ROLES) return upper as RoleKey;
  // Common aliases seen across the codebase / DB.
  if (upper === 'FOUNDER') return 'FOUNDER';
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'MODERATOR' || upper === 'MOD') return 'MODERATOR';
  return 'MEMBER';
}

export function roleGlowShadow(role: RoleKey): string {
  const def = ROLES[role];
  return def.glow === 'none' ? 'none' : `0 0 8px ${def.glow}`;
}
