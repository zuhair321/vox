import React, { useEffect, useState } from 'react';

interface Props {
  onComplete?: () => void;
  /** Pass the stored token — if already logged in, skip the delay. */
  token?: string | null;
}

const SplashScreen: React.FC<Props> = ({ onComplete, token }) => {
  const [fading, setFading] = useState(false);
  const [scale, setScale] = useState(0.1);
  const [rotate, setRotate] = useState(0);
  const [blur, setBlur] = useState(20);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // If already logged in, skip the splash delay — go straight to the app.
    if (token) {
      if (onComplete) onComplete();
      return;
    }

    // Enhanced splash animation sequence
    const timer = setTimeout(() => {
      // Phase 1: Scale up and rotate the circle
      setScale(1.2);
      setRotate(360);
      setBlur(0);
      setOpacity(1);
      
      setTimeout(() => {
        // Phase 2: Slight overshoot bounce
        setScale(0.95);
        
        setTimeout(() => {
          // Phase 3: Settle to normal scale
          setScale(1);
          
          setTimeout(() => {
            // Phase 4: Begin fade out and expand to full screen
            setFading(true);
            
            setTimeout(() => {
              if (onComplete) onComplete();
            }, 400); // Wait for fade out
          }, 300);
        }, 200);
      }, 500);
    }, 300); // Initial delay

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
        transition: 'opacity 0.8s ease',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 
            'conic-gradient(from 0deg, transparent 0%, transparent 30%, var(--void-purple) 30%, var(--void-purple) 70%, transparent 70%, transparent 100%)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 
            '0 0 30px rgba(59, 10, 18, 0.5), ' +
            '0 0 60px rgba(216, 74, 90, 0.3), ' +
            '0 0 100px rgba(216, 74, 90, 0.2)',
          transform: `scale(${scale}) rotate(${rotate}deg)`,
          filter: `blur(${blur}px)`,
          opacity,
          transition: 
            'transform 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), ' +
            'filter 0.8s ease, ' +
            'opacity 0.8s ease',
        }}
      >
        {/* Inner glowing core */}
        <div
          style={{
            position: 'absolute',
            inset: '20px',
            borderRadius: '50%',
            background: 
              'radial-gradient(circle at center, var(--chaos) 0%, transparent 70%)',
            opacity: 0.6,
            animation: 'pulseInner 2s ease-in-out infinite',
          }}
        />
        
        {/* Outer ring animation */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 
              'conic-gradient(from 0deg, transparent 0%, transparent 25%, var(--chaos) 25%, var(--chaos) 35%, transparent 35%, transparent 100%)',
            animation: 'rotateRing 3s linear infinite'
          }}
        />
        
        {/* Center glow */}
        <div
          style={{
            position: 'absolute',
            inset: '40px',
            borderRadius: '50%',
            background: 
              'radial-gradient(circle at center, rgba(216, 74, 90, 0.3) 0%, transparent 70%)',
            opacity: 0.8
          }}
        />
      </div>
      
      {/* Text elements */}
      <div
        style={{
          fontFamily: "'Cinzel Decorative', cursive",
          fontSize: '56px',
          background:
            'linear-gradient(135deg, var(--void-purple), var(--chaos), var(--blood))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px rgba(102,0,204,0.4))',
          marginTop: '20px',
          opacity: 1,
          transition: 'opacity 0.8s ease',
          animation: 'textGlow 2s ease-in-out infinite',
        }}
      >
        VOX
      </div>

      <div
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '16px',
          color: 'var(--shadow)',
          letterSpacing: '0.5em',
          marginTop: '12px',
          opacity: 1,
          transition: 'opacity 0.8s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        INITIALIZING
        <div style={{ display: 'flex', gap: '3px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--chaos)',
                borderRadius: '50%',
                opacity: 0.4,
                animation: `dotPulse 1.8s ease-in-out infinite ${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
