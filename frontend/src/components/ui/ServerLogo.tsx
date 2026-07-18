import React, { useState } from 'react';

interface ServerLogoProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const ServerLogo: React.FC<ServerLogoProps> = ({
  src,
  name,
  size = 48,
  className = '',
  style = {},
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  const showImage = src && !imgError;

  return (
    <div
      className={`server-logo octagon ${className}`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        background: showImage ? 'var(--obsidian)' : 'var(--dark-matter)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      title={name}
    >
      {showImage ? (
        <img
          src={src.startsWith('http') ? src : src.startsWith('/') ? src : `/${src}`}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span style={{
          color: 'rgba(255,255,255,0.85)',
          fontWeight: 800,
          fontSize: size * 0.38,
          lineHeight: 1,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          zIndex: 1,
        }}>
          {initials}
        </span>
      )}
    </div>
  );
};

export default ServerLogo;
