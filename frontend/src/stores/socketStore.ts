import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../api/client';
import { useMessageStore } from './messageStore';
import { useDMStore } from './dmStore';
import { useServerStore } from './serverStore';
import { useNotificationStore } from './notificationStore';
import type { Attachment } from '../types';

import { useProfileStore } from './profileStore';
import { useUiStore } from './uiStore';
import { playSound } from '../utils/soundManager';

// Module-level map to track previous presence status for join/leave detection.
const presenceMap = new Map<string, string>();

interface SocketStore {
  socket: Socket | null;
  connected: boolean;

  connect: (token: string) => void;
  disconnect: () => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string, parentId?: string, attachments?: Attachment[]) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  sendDM: (recipientId: string, content: string, attachments?: Attachment[]) => void;
  startDmTyping: (recipientId: string) => void;
  stopDmTyping: (recipientId: string) => void;
  sendDmRead: (dmId: string) => void;
  updateStatus: (status: string) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => {
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const reconnectDelay = () => Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff up to 30s

  return {
  socket: null,
  connected: false,

  connect: (token) => {
    if (get().socket) return;
    const socket = io(API_BASE, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    // Before reconnecting, update the auth token in case it was refreshed
    // while the socket was disconnected.
    socket.on('connect_error', () => {
      const freshToken = localStorage.getItem('vox_token');
      if (freshToken) {
        (socket as any).auth = { token: freshToken };
      }
    });

    socket.on('connect', () => {
      set({ connected: true });
      reconnectAttempts = 0;
    });
    socket.on('disconnect', (reason) => {
      set({ connected: false });
      if (reason !== 'io client disconnect') {
        reconnectAttempts++;
      }
    });
    socket.on('connect_error', (err) => {
      console.warn('[Socket] connect error:', err.message);
      reconnectAttempts++;
    });
    socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] reconnected after', attemptNumber, 'attempts');
      reconnectAttempts = 0;
      set({ connected: true });
    });
    socket.on('reconnect_failed', () => {
      console.error('[Socket] reconnection failed after', MAX_RECONNECT_ATTEMPTS, 'attempts');
    });

    socket.on('message:new', ({ message }) => {
      useMessageStore.getState().addMessage(message.channelId, message);

      // Generate a notification when a message mentions the current user.
      // We avoid notifying for our own messages.
      try {
        const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
        const isMine = message.userId === me.id || message.author?.id === me.id;
        const body: string = message.body || '';
        const mentioned =
          me.username && new RegExp(`@${me.username}\\b`, 'i').test(body);
        // Play ambient sound for incoming messages (ping for mentions, soft blip otherwise).
        if (!isMine) playSound(mentioned ? 'ping' : 'message');
        if (!isMine && mentioned) {
          useNotificationStore.getState().addNotification({
            type: 'mention',
            title: `${message.author?.username || 'Someone'} mentioned you`,
            preview: body.slice(0, 120),
            channelId: message.channelId,
            messageId: message.id,
            userId: message.userId,
          });
          // Browser native notification
          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            new Notification(message.author?.username || 'VOX', {
              body: body.length > 80 ? body.slice(0, 77) + '...' : body,
              icon: '/vox-icon.png',
              tag: `mention-${message.id}`,
            });
          }
          if (document.hidden) {
            (window as any).electronAPI?.flashFrame?.();
          }
        }
      } catch {
        // localStorage parse failure — skip notification.
      }
    });

    socket.on('message:updated', ({ message }) => {
      useMessageStore.getState().updateMessage(message.channelId, message);
    });

    socket.on('message:deleted', ({ messageId, channelId }) => {
      useMessageStore.getState().removeMessage(channelId, messageId);
    });

    socket.on('typing:start', ({ username, channelId, kind = 'text' }) => {
      useMessageStore.getState().setTyping(channelId, username, true, kind);
    });

    socket.on('typing:stop', ({ username, channelId }) => {
      useMessageStore.getState().setTyping(channelId, username, false);
    });

    socket.on('presence:update', ({ userId, status }) => {
      // Play ambient join/leave sounds.
      // We track previous status in a module-level Map to detect transitions.
      const prev = presenceMap.get(userId);
      presenceMap.set(userId, status);
      if (prev !== undefined && prev !== status) {
        const isJoin = status === 'online';
        const isLeave = status === 'offline';
        if (isJoin || isLeave) playSound(isJoin ? 'join' : 'leave');
      }
      useServerStore.getState().updateMemberStatus(userId, status);
    });

    socket.on('dm:new', ({ message }) => {
      // Push incoming + echoed DMs into the DM store so they render in the
      // conversation view. The store keys messages by `message.dmId`.
      useDMStore.getState().addMessage(message);

      // Notify on DMs from other users (skip our own echoed sends).
      try {
        const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
        const senderId = message.senderId || message.userId;
        if (senderId && senderId !== me.id) {
          playSound('message');
          useNotificationStore.getState().addNotification({
            type: 'dm',
            title: `New message from ${message.sender?.username || 'Unknown'}`,
            preview: (message.content || '').slice(0, 120),
            messageId: message.id,
            userId: senderId,
          });
          if (document.hidden) {
            (window as any).electronAPI?.flashFrame?.();
          }
        }
      } catch {
        // skip
      }
    });

    socket.on('dm:updated', ({ message }) => {
      useDMStore.getState().updateMessage(message);
    });

    socket.on('dm:deleted', ({ messageId, dmId }) => {
      useDMStore.getState().removeMessage(dmId, messageId);
    });

    socket.on('dm:typing:start', ({ userId, username, dmId }) => {
      useDMStore.getState().setTyping(dmId, userId, username, true);
    });

    socket.on('dm:typing:stop', ({ userId, dmId }) => {
      useDMStore.getState().setTyping(dmId, userId, '', false);
    });

    socket.on('dm:error', ({ error }) => {
      console.warn('[DM] server error:', error);
      useUiStore.getState().addToast(error || 'Failed to send message.', 'error');
    });

    socket.on('dm:read', ({ dmId, by }) => {
      // Read receipt from the other user — could be used for read indicators
      console.log('[DM] read receipt for', dmId, 'by', by);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      console.log('[Socket] Disconnecting and cleaning up listeners');
      // Unregister all listeners to prevent memory leaks
      socket.removeAllListeners();
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  joinChannel: (channelId) => {
    get().socket?.emit('channel:join', channelId);
  },

  leaveChannel: (channelId) => {
    get().socket?.emit('channel:leave', channelId);
  },

  sendMessage: (channelId, content, parentId, attachments) => {
    playSound('send');
    get().socket?.emit('message:send', { channelId, content, parentId, attachments });
  },

  editMessage: (messageId, content) => {
    get().socket?.emit('message:edit', { messageId, content });
  },

  deleteMessage: (messageId) => {
    get().socket?.emit('message:delete', { messageId });
  },

  reactToMessage: (messageId, emoji) => {
    get().socket?.emit('message:react', { messageId, emoji });
  },

  startTyping: (channelId) => {
    get().socket?.emit('typing:start', { channelId });
  },

  stopTyping: (channelId) => {
    get().socket?.emit('typing:stop', { channelId });
  },

  sendDM: (recipientId, content, attachments) => {
    get().socket?.emit('dm:send', { recipientId, content, attachments });
  },

  startDmTyping: (recipientId) => {
    get().socket?.emit('dm:typing:start', { recipientId });
  },

  stopDmTyping: (recipientId) => {
    get().socket?.emit('dm:typing:stop', { recipientId });
  },

  sendDmRead: (dmId) => {
    get().socket?.emit('dm:read', { dmId });
  },

  updateStatus: (status) => {
    get().socket?.emit('status:update', { status });
    // Also update our own member entry in the server store locally, so the
    // member panel reflects our status change instantly instead of waiting
    // for the server to echo a presence:update back to us.
    try {
      const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
      if (me.id) {
        useServerStore.getState().updateMemberStatus(me.id, status.toLowerCase());
      }
    } catch {
      // localStorage parse failure — non-critical.
    }
  },
};
});
