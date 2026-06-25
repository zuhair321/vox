interface ServerIconProps {
  icon: React.ReactNode;
  name: string;
  active?: boolean;
  color?: string;
}

// Octagon server icon with rotating ritual ring when active.
export default function ServerIcon({ icon, name, active = false, color }: ServerIconProps) {
  return (
    <div
      className={`void-pull ${active ? 'energy-border-active' : ''}`}
      style={{
        position: 'relative',
        width: 44,
        height: 44,
        display: 'grid',
        placeItems: 'center',
        clipPath: 'var(--octagon)',
        background: color || 'var(--dark-matter)',
        cursor: 'pointer',
      }}
      title={name}
    >
      {icon}
    </div>
  );
}
