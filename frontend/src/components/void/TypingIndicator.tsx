// Venom-drip typing indicator. Three chaos-purple dots with elastic easing.
interface TypingIndicatorProps {
  users: string[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;
  const label =
    users.length === 1 ? `${users[0]} is casting...` : `${users.join(', ')} are casting...`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 18px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="venom-dot"
            style={{
              width: 6,
              height: 6,
              background: 'var(--chaos)',
              borderRadius: '50%',
            }}
          />
        ))}
      </div>
      <span style={{ color: 'var(--shadow)', fontSize: '12px' }}>{label}</span>
    </div>
  );
}
