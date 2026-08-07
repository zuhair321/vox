import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { getApiBase } from '../api/client';
import { useMessageStore } from './messageStore';
import { useDMStore } from './dmStore';
import { useServerStore } from './serverStore';
import { useNotificationStore } from './notificationStore';
import type { Attachment } from '../types';

import { useProfileStore } from './profileStore';
import { useUiStore } from './uiStore';
import { playSound } from '../utils/soundManager';
import { useAuthStore } from './authStore';

// Module-level map to track previous presence status for join/leave detection.
const presenceMap = new Map<string, string>();

interface SocketStore {
  socket: Socket | null;
  connected: boolean;

  connect: () => void;
  disconnect: () => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string, parentId?: string, attachments?: Attachment[]) => void;
  editMessage: (channelId: string, messageId: string) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
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
  const reconnectDelay = () => Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

  return {
  socket: null,
  connected: false,

  connect: () => {
    const token = useAuthStore.getState().accessToken;
    if (!token || get().socket) return;
    const socket = io(getApiBase(), {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect_error', () => {
      const freshToken = useAuthStore.getState().accessToken || sessionStorage.getItem('vox_access') || localStorage.getItem('vox_access');
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

    // Realtime auto-mod block: notify the user their message was rejected.
    socket.on('automod:blocked', ({ reason, timedOut }) => {
      useUiStore.getState().addToast(
        timedOut ? `Auto-mod blocked your message (${reason}). You were timed out.` : `Auto-mod blocked your message: ${reason}`,
        'error'
      );
    });

    // Server-deleted broadcast: every connected client drops this server id
    // from its local cache so the sidebar/rail stops showing a phantom row.
    socket.on('server:deleted', ({ serverId }) => {
      if (!serverId) return;
      try {
        useServerStore.getState().removeServer(serverId);
      } catch { /* store not mounted yet */ }
      try {
        const me = JSON.parse(localStorage.getItem('vox_user') || '{}');
        if (me?.id) {
          useUiStore.getState().addToast('A server you were in was deleted.', 'warning');
        }
      } catch { /* ignore */ }
    });

    socket.on('typing:start', ({ username, channelId, kind = 'text' }) => {
      useMessageStore.getState().setTyping(channelId, username, true, kind);
    });

    socket.on('typing:stop', ({ username, channelId }) => {
      useMessageStore.getState().setTyping(channelId, username, false);
    });

    socket.on('presence:update', ({ userId, status }) => {
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
      useDMStore.getState().addMessage(message);

      try {
        const me = useAuthStore.getState().user;
        const senderId = message.senderId || message.userId;
        if (senderId && senderId !== me?.id) {
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

    socket.on('message:deleted', ({ messageId, channelId }) => {
      const targetChannel = channelId || '';
      if (targetChannel) {
        useMessageStore.getState().removeMessage(targetChannel, messageId);
      }
    });

    // ── Threads ───────────────────────────────────────────────
    // Live `thread:reply` delivery:
    //   * If the user has this thread panel open, the reply drops into the
    //     cached thread key so it renders without a refetch.
    //   * Otherwise, bump the uiStore's unread map so the parent message's
    //     ThreadIndicator shows a "(N)" badge.
    socket.on('thread:reply', ({ parentId, reply }) => {
      try {
        const ui = useUiStore.getState();
        if (ui.threadMessageId === parentId) {
          useMessageStore.getState().addMessage(`thread-${parentId}`, reply);
        }
        const me = (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}'); } catch { return {}; } })();
        const isMine = reply?.userId === me.id || reply?.author?.id === me.id;
        if (!isMine && ui.threadMessageId !== parentId) {
          ui.bumpThreadUnread(parentId, 1);
        }
      } catch { /* non-fatal */ }
    });

    // Typing dots for the active thread panel. We bounce the event through
    // uiStore's threadTyping map (per channelId:parentId) so the panel just
    // reads it without needing a redundant store.
    socket.on('thread:typing', ({ channelId, parentId, userId, typing }) => {
      try {
        const me = (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}'); } catch { return {}; } })();
        if (!channelId || !parentId || userId === me.id) return;
        const key = `${channelId}:${parentId}`;
        const ui = useUiStore.getState();
        if (typing) ui.bumpThreadTyping(key, userId);
        else ui.clearThreadTyping(key, userId);
      } catch { /* non-fatal */ }
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
    playSound('send');
    get().socket?.emit('status:update', { status });
    try {
      const me = useAuthStore.getState().user;
      if (me?.id) {
        useServerStore.getState().updateMemberStatus(me.id, status.toLowerCase());
      }
    } catch {
      // skip
    }
  },
};
});
