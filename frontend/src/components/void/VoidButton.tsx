interface VoidButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

// Angular cut-corner button with void-pull hover. Variants:
// primary (chaos gradient + glow), secondary (transparent + rim),
// danger (crimson).
export default function VoidButton({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  style,
  className = '',
}: VoidButtonProps) {
  const variantStyle: React.CSSProperties =
    variant === 'primary'
      ? {
          background: 'linear-gradient(135deg, var(--void-purple), var(--chaos))',
          color: '#fff',
          boxShadow: '0 0 20px var(--chaos-glow)',
        }
      : variant === 'danger'
      ? {
          background: 'var(--crimson)',
          color: '#fff',
        }
      : {
          background: 'transparent',
          color: 'var(--ghost-white)',
          border: '1px solid var(--rim)',
        };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`void-pull ${className}`}
      style={{
        ...variantStyle,
        clipPath: 'var(--cut-corner-all)',
        padding: '12px 20px',
        fontFamily: 'var(--font-ui)',
        fontSize: '13px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
