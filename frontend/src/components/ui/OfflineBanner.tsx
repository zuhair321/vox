import React, { useState, useEffect } from 'react';

const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      // Trigger exit animation before hiding
      setExiting(true);
      setTimeout(() => setIsOnline(true), 300);
    };
    const handleOffline = () => {
      setExiting(false);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className={exiting ? 'offline-banner-exit' : ''}
      style={{
        position: 'fixed',
        top: 32, // Just below TitleBar
        left: 0,
        right: 0,
        height: '36px',
        background: 'var(--blood)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '13px',
        letterSpacing: '0.2em',
        zIndex: 9998,
        animation: exiting ? undefined : 'slideDown 0.3s ease-out forwards',
        boxShadow: '0 4px 12px rgba(216, 74, 90, 0.4)',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      ⚠ NO SIGNAL — OPERATING IN SHADOW MODE
    </div>
  );
};

export default OfflineBanner;
