import React from 'react';
import { ROLES, normalizeRole, RoleKey } from '../../config/roles';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
}

// Angular pill showing a role's emoji + label, colored by the role. Drop next
// to a username in messages, the member list, and the profile popup.
const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm' }) => {
  const key: RoleKey = normalizeRole(role);
  const def = ROLES[key];
  if (!def.badge) return null; // plain members show nothing

  const fontSize = size === 'md' ? 12 : 10;
  const padding = size === 'md' ? '2px 8px' : '1px 6px';

  return (
    <span
      className="role-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontFamily: "'Creepster', cursive",
        fontSize,
        padding,
        letterSpacing: '0.1em',
        color: def.color,
        background: hexToRgba(def.color, 0.12),
        border: `1px solid ${hexToRgba(def.color, 0.4)}`,
        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%)',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      }}
    >
      <span aria-hidden="true">{def.badge}</span>
      {def.label}
    </span>
  );
};

// Helper: convert #rrggbb + alpha into an rgba() string for the bg/border.
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default RoleBadge;
