import { useEffect } from 'react';
import { useSocketStore } from '../stores/socketStore';

export function usePresence() {
  const { updateStatus } = useSocketStore();

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      updateStatus('online');
      idleTimer = setTimeout(() => {
        updateStatus('idle');
      }, 5 * 60 * 1000); // 5 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);

    // Initial setup
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [updateStatus]);
}
