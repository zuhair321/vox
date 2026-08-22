import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 32,
            left: 0,
            right: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'linear-gradient(90deg, rgba(216,74,90,0.9), rgba(139,0,0,0.9))',
            color: '#fff',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '12px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <WifiOff size={14} />
          CONNECTION LOST — RECONNECTING...
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
