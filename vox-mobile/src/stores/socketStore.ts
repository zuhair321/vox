// Vox Mobile — Socket store (Socket.io connection and event handling)

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../api/client';
import { getAccessToken } from '../utils/storage';
import { useAuthStore } from './authStore';
import { useServerStore } from './serverStore';
import { useMessageStore } from './messageStore';
import { useDMStore } from './dmStore';
import { useVoiceStore } from './voiceStore';
import { voiceRTC } from '../services/voiceRTC';
import type { Message, DMMessage, VoicePeer } from '../types';

interface SocketState {
  socket: Socket | null;
  connected: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;

  // Emitters
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string, parentId?: string, attachments?: any[]) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  sendDM: (recipientId: string, content: string, attachments?: any[]) => void;
  startDmTyping: (recipientId: string) => void;
  stopDmTyping: (recipientId: string) => void;
  sendDmRead: (dmId: string) => void;
  updateStatus: (status: string) => void;

  // Voice emitters
  joinVoice: (channelId: string, serverId: string) => void;
  leaveVoice: () => void;
  sendVoiceOffer: (to: string, offer: any) => void;
  sendVoiceAnswer: (to: string, answer: any) => void;
  sendVoiceIceCandidate: (to: string, candidate: any) => void;
  sendVoiceMute: (muted: boolean) => void;
  sendVoiceDeafen: (deafened: boolean) => void;
  sendVoiceSpeaking: (speaking: boolean) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: async () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const token = await getAccessToken();
    if (!token) return;

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    // Connection events
    socket.on('connect', () => {
      set({ connected: true });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('connect_error', async () => {
      // Try to refresh token on auth failure
      const newToken = await getAccessToken();
      if (newToken) {
        socket.auth = { token: newToken };
      }
    });

    // State init
    socket.on('state:init', (data: any) => {
      // Server store will handle this via fetchServers
    });

    // Message events
    socket.on('message:new', (data: { message: Message; channelId?: string }) => {
      const channelId = data.channelId || data.message.channelId;
      const currentUserId = useAuthStore.getState().user?.id;
      useMessageStore.getState().addMessage(channelId, data.message);

      // Increment unread if not from current user and not in active channel
      if (data.message.userId !== currentUserId) {
        const selectedChannel = useServerStore.getState().selectedChannel;
        if (!selectedChannel || selectedChannel.id !== channelId) {
          useMessageStore.getState().incrementUnread(channelId);
        }
      }
    });

    socket.on('message:updated', (data: { message: Message }) => {
      useMessageStore.getState().updateMessage(data.message.channelId, data.message);
    });

    socket.on('message:deleted', (data: { messageId: string; channelId: string }) => {
      useMessageStore.getState().removeMessage(data.channelId, data.messageId);
    });

    socket.on('message:reactions', (data: { messageId: string; channelId: string; reactions: Record<string, number> }) => {
      // Update reactions on the message
      const store = useMessageStore.getState();
      const msgs = store.messages[data.channelId] || [];
      const msg = msgs.find(m => m.id === data.messageId);
      if (msg) {
        store.updateMessage(data.channelId, { ...msg, reactions: data.reactions });
      }
    });

    // Typing events
    socket.on('typing:start', (data: { username: string; channelId: string }) => {
      useMessageStore.getState().setTyping(data.channelId, data.username, true);
    });

    socket.on('typing:stop', (data: { username: string; channelId: string }) => {
      useMessageStore.getState().setTyping(data.channelId, data.username, false);
    });

    // Presence
    socket.on('presence:update', (data: { userId: string; status: string }) => {
      useServerStore.getState().updateMemberStatus(data.userId, data.status);
    });

    // DM events
    socket.on('dm:new', (data: { message: DMMessage }) => {
      const currentUserId = useAuthStore.getState().user?.id;
      useDMStore.getState().addMessage(data.message);

      // Increment unread if not from current user
      if (data.message.senderId !== currentUserId) {
        const selectedDM = useDMStore.getState().selectedDM;
        if (selectedDM !== data.message.dmId) {
          useDMStore.getState().incrementUnread(data.message.dmId);
        }
      }
    });

    socket.on('dm:updated', (data: { message: DMMessage }) => {
      useDMStore.getState().updateMessage(data.message);
    });

    socket.on('dm:deleted', (data: { messageId: string; dmId: string }) => {
      useDMStore.getState().removeMessage(data.dmId, data.messageId);
    });

    socket.on('dm:typing:start', (data: { userId: string; username: string; dmId: string }) => {
      useDMStore.getState().setTyping(data.dmId, data.userId, data.username, true);
    });

    socket.on('dm:typing:stop', (data: { userId: string; dmId: string }) => {
      useDMStore.getState().setTyping(data.dmId, data.userId, '', false);
    });

    socket.on('dm:read', (data: { dmId: string; by: string }) => {
      // Could update read receipts
    });

    // Voice events
    socket.on('voice:existing-peers', (data: { peers: VoicePeer[] }) => {
      const voicePeers = data.peers.map(p => ({
        ...p,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
      }));
      useVoiceStore.getState().setPeers(voicePeers);
    });

    socket.on('voice:user-joined', (data: { socketId: string; userId: string; username: string }) => {
      useVoiceStore.getState().addPeer({
        ...data,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
      });
    });

    socket.on('voice:user-left', (data: { socketId: string }) => {
      useVoiceStore.getState().removePeer(data.socketId);
    });

    socket.on('voice:user-muted', (data: { socketId: string; muted: boolean }) => {
      useVoiceStore.getState().updatePeer(data.socketId, { isMuted: data.muted });
    });

    socket.on('voice:user-deafened', (data: { socketId: string; deafened: boolean }) => {
      useVoiceStore.getState().updatePeer(data.socketId, { isDeafened: data.deafened });
    });

    socket.on('voice:user-speaking', (data: { socketId: string; speaking: boolean }) => {
      useVoiceStore.getState().updatePeer(data.socketId, { isSpeaking: data.speaking });
    });

    // WebRTC signaling
    socket.on('voice:existing-peers', (data: { peers: VoicePeer[] }) => {
      const voicePeers = data.peers.map(p => ({
        ...p,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
      }));
      useVoiceStore.getState().setPeers(voicePeers);
      // The newcomer initiates offers to everyone already in the channel.
      voiceRTC.start(data.peers.map(p => p.socketId));
    });

    socket.on('voice:user-joined', (data: { socketId: string; userId: string; username: string }) => {
      useVoiceStore.getState().addPeer({
        ...data,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
      });
      // Existing peers wait for the newcomer's offer — no action needed.
    });

    socket.on('voice:user-left', (data: { socketId: string }) => {
      useVoiceStore.getState().removePeer(data.socketId);
      voiceRTC.removePeer(data.socketId);
    });

    socket.on('voice:offer', (data: { from: string; offer: any }) => {
      voiceRTC.handleOffer(data.from, data.offer);
    });

    socket.on('voice:answer', (data: { from: string; answer: any }) => {
      voiceRTC.handleAnswer(data.from, data.answer);
    });

    socket.on('voice:ice-candidate', (data: { from: string; candidate: any }) => {
      voiceRTC.handleIce(data.from, data.candidate);
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

  // Channel emitters
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

  // DM emitters
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
  },

  // Voice emitters
  joinVoice: (channelId, serverId) => {
    get().socket?.emit('voice:join', { channelId, serverId });
  },

  leaveVoice: () => {
    get().socket?.emit('voice:leave');
  },

  sendVoiceOffer: (to, offer) => {
    get().socket?.emit('voice:offer', { to, offer });
  },

  sendVoiceAnswer: (to, answer) => {
    get().socket?.emit('voice:answer', { to, answer });
  },

  sendVoiceIceCandidate: (to, candidate) => {
    get().socket?.emit('voice:ice-candidate', { to, candidate });
  },

  sendVoiceMute: (muted) => {
    get().socket?.emit('voice:mute', { muted });
  },

  sendVoiceDeafen: (deafened) => {
    get().socket?.emit('voice:deafen', { deafened });
  },

  sendVoiceSpeaking: (speaking) => {
    get().socket?.emit('voice:speaking', { speaking });
  },
}));
