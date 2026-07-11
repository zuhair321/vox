import React, { useEffect, useState } from 'react';

interface Props {
  onComplete?: () => void;
  /** Pass the stored token — if already logged in, skip the delay. */
  token?: string | null;
}

const SplashScreen: React.FC<Props> = ({ onComplete, token }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // If already logged in, skip the splash delay — go straight to the app.
    if (token) {
      if (onComplete) onComplete();
      return;
    }
    // The splash screen finishes its intro after 2 seconds
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 400); // Wait for fade out
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete, token]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        style={{
          fontFamily: "'Cinzel Decorative', cursive",
          fontSize: '80px',
          background: 'linear-gradient(135deg, var(--void-purple), var(--chaos), var(--blood))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(102,0,204,0.5))',
          animation: 'splashLogoIn 0.8s ease-out forwards',
        }}
      >
        VOX
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '14px',
          color: 'var(--shadow)',
          letterSpacing: '0.3em',
          marginTop: '20px',
          opacity: 0,
          animation: 'splashTextIn 0.5s ease-out forwards 0.8s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        INITIALIZING
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '4px',
                height: '4px',
                backgroundColor: 'var(--chaos)',
                borderRadius: '50%',
                opacity: 0.3,
                animation: `dotLoad 1.5s infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
