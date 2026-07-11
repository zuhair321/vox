// Vox Mobile — Socket lifecycle hook

import { useEffect } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';

export function useSocket() {
  const socket = useSocketStore(s => s.socket);
  const connected = useSocketStore(s => s.connected);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (user && !socket?.connected) {
      useSocketStore.getState().connect();
    }
  }, [user]);

  return { socket, connected };
}
