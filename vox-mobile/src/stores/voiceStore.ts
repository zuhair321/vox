// Vox Mobile — Voice store (WebRTC)

import { create } from 'zustand';
import type { MediaStream } from 'react-native-webrtc';
import { useSocketStore } from './socketStore';

export interface RemoteVoiceStream {
  socketId: string;
  stream: MediaStream;
}

interface VoicePeer {
  socketId: string;
  userId: string;
  username: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}

interface VoiceState {
  isConnected: boolean;
  channelId: string | null;
  serverId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  peers: VoicePeer[];
  remoteStreams: RemoteVoiceStream[];

  // Actions
  joinVoice: (channelId: string, serverId: string) => void;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setSpeaking: (speaking: boolean) => void;
  addPeer: (peer: VoicePeer) => void;
  removePeer: (socketId: string) => void;
  updatePeer: (socketId: string, updates: Partial<VoicePeer>) => void;
  setPeers: (peers: VoicePeer[]) => void;
  setRemoteStreams: (streams: RemoteVoiceStream[]) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isConnected: false,
  channelId: null,
  serverId: null,
  isMuted: false,
  isDeafened: false,
  isSpeaking: false,
  peers: [],
  remoteStreams: [],

  joinVoice: (channelId, serverId) => {
    set({ isConnected: true, channelId, serverId, isMuted: false, isDeafened: false });
  },

  leaveVoice: () => {
    set({ isConnected: false, channelId: null, serverId: null, peers: [], remoteStreams: [], isMuted: false, isDeafened: false, isSpeaking: false });
  },

  toggleMute: () => {
    set(state => ({ isMuted: !state.isMuted }));
  },

  toggleDeafen: () => {
    set(state => {
      const newDeafened = !state.isDeafened;
      return { isDeafened: newDeafened, isMuted: newDeafened ? true : state.isMuted };
    });
  },

  setSpeaking: (speaking) => set({ isSpeaking: speaking }),

  addPeer: (peer) => {
    set(state => {
      if (state.peers.some(p => p.socketId === peer.socketId)) return state;
      return { peers: [...state.peers, peer] };
    });
  },

  removePeer: (socketId) => {
    set(state => ({ peers: state.peers.filter(p => p.socketId !== socketId) }));
  },

  updatePeer: (socketId, updates) => {
    set(state => ({
      peers: state.peers.map(p => (p.socketId === socketId ? { ...p, ...updates } : p)),
    }));
  },

  setPeers: (peers) => set({ peers }),

  setRemoteStreams: (streams) => set({ remoteStreams: streams }),

  reset: () => set({ isConnected: false, channelId: null, serverId: null, isMuted: false, isDeafened: false, isSpeaking: false, peers: [], remoteStreams: [] }),
}));
