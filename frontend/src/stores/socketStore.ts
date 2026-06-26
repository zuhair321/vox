import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../api/client';
import { useMessageStore } from './messageStore';
import { useDMStore } from './dmStore';
import { useServerStore } from './serverStore';
import { useNotificationStore } from './notificationStore';
import type { Attachment } from '../types';

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
  updateStatus: (status: string) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  connected: false,

  connect: (token) => {
    if (get().socket) return;
    const socket = io(API_BASE, {
      auth: { token }
    });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

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
        if (!isMine && mentioned) {
          useNotificationStore.getState().addNotification({
            type: 'mention',
            title: `${message.author?.username || 'Someone'} mentioned you`,
            preview: body.slice(0, 120),
            channelId: message.channelId,
            messageId: message.id,
            userId: message.userId,
          });
          // Flash the taskbar in Electron when the window is hidden.
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

    socket.on('typing:start', ({ username, channelId }) => {
      useMessageStore.getState().setTyping(channelId, username, true);
    });

    socket.on('typing:stop', ({ username, channelId }) => {
      useMessageStore.getState().setTyping(channelId, username, false);
    });

    socket.on('presence:update', ({ userId, status }) => {
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
          useNotificationStore.getState().addNotification({
            type: 'dm',
            title: `New message from ${message.author?.username || message.senderUsername || 'Unknown'}`,
            preview: (message.content || message.body || '').slice(0, 120),
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

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
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
  }
}));
