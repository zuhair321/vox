import { create } from 'zustand';

export interface VoiceUser {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  speaking: boolean;
  muted: boolean;
  deafened: boolean;
  screenSharing?: boolean;
  amplitude?: number;
  seatPosition?: { x: number; y: number };
}

interface VoiceStore {
  connected: boolean;
  joinInProgress: boolean;
  channelId: string | null;
  serverId: string | null;
  /** Which media transport the active voice session is using. */
  transport: 'mesh' | 'sfu' | null;
  joinedAt: number | null;
  localStream: MediaStream | null;
  peers: Map<string, RTCPeerConnection>;
  remoteStreams: Map<string, MediaStream>;
  voiceUsers: VoiceUser[];
  localMuted: boolean;
  localDeafened: boolean;
  localSpeaking: boolean;
  localVideo: boolean;
  screenSharing: boolean;
  // Screen share ────────────────────────────────────────────────
  /** Local display-capture stream (screen + optional system audio). */
  localScreenStream: MediaStream | null;
  /** Per-peer screen stream (subset of remoteStreams tracks; tracked separately so the overlay can render just the video element). */
  remoteScreenStreams: Map<string, MediaStream>;
  /** Per-peer webcam video streams (separate from screen share). */
  remoteVideoStreams: Map<string, MediaStream>;
  // Spatial audio ───────────────────────────────────────────────
  /** Seat positions for spatial audio (userId -> {x, y} where x,y are in [-1, 1] range) */
  seatPositions: Record<string, { x: number; y: number }>;
  setLocalVideo: (enabled: boolean) => void;
  setScreenSharing: (enabled: boolean) => void;
  setLocalScreenStream: (stream: MediaStream | null) => void;
  setRemoteScreenStream: (socketId: string, stream: MediaStream) => void;
  clearRemoteScreenStream: (socketId: string) => void;
  setUserScreenSharing: (socketId: string, sharing: boolean) => void;
  // Remote video streams
  setRemoteVideoStream: (socketId: string, stream: MediaStream) => void;
  clearRemoteVideoStream: (socketId: string) => void;
  // Spatial audio methods
  setUserSeatPosition: (userId: string, position: { x: number; y: number }) => void;
  clearSeatPositions: () => void;
  // ─────────────────────────────────────────────────────────────
  clearChannel: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setLocalMuted: (muted: boolean) => void;
  setLocalDeafened: (deafened: boolean) => void;
  setLocalSpeaking: (speaking: boolean) => void;
  setJoinedAt: (ts: number) => void;
  setJoinInProgress: (progress: boolean) => void;
  addPeer: (socketId: string, pc: RTCPeerConnection) => void;
  removePeer: (socketId: string) => void;
  addRemoteStream: (socketId: string, stream: MediaStream) => void;
  addVoiceUser: (user: VoiceUser) => void;
  removeVoiceUser: (socketId: string) => void;
  updateVoiceUser: (socketId: string, updates: Partial<VoiceUser>) => void;
  setUserAmplitude: (socketId: string, amplitude: number) => void;
  setChannel: (channelId: string, serverId: string) => void;
  /** Set the active media transport. Pass null when leaving a channel. */
  setTransport: (transport: 'mesh' | 'sfu' | null) => void;
  pendingPeers: Set<string>;
  pendingCandidates: Map<string, RTCIceCandidateInit[]>;
  clearAll: () => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  connected: false,
  joinInProgress: false,
  channelId: null,
  serverId: null,
  joinedAt: null,
  localStream: null,
  peers: new Map(),
  remoteStreams: new Map(),
  voiceUsers: [],
  transport: null,
  localMuted: false,
  localDeafened: false,
  localSpeaking: false,
  localVideo: false,
  screenSharing: false,
  localScreenStream: null,
  remoteScreenStreams: new Map(),
  remoteVideoStreams: new Map(),
  // Spatial audio
  seatPositions: {},
  pendingPeers: new Set(),
  pendingCandidates: new Map(),

  setChannel: (channelId: string, serverId: string) => set({
    channelId,
    serverId,
    connected: true,
  }),

  setJoinInProgress: (progress: boolean) => set({ joinInProgress: progress }),

  setTransport: (transport) => set({ transport }),

  clearChannel: () => {
    const { localStream, localScreenStream, peers, remoteStreams, remoteVideoStreams } = get();
    localStream?.getTracks().forEach(t => t.stop());
    localScreenStream?.getTracks().forEach(t => t.stop());
    remoteVideoStreams.forEach(stream => stream.getTracks().forEach(t => t.stop()));
    peers.forEach(pc => pc.close());
    set({
      connected: false,
      channelId: null,
      serverId: null,
      joinedAt: null,
      localStream: null,
      localScreenStream: null,
      peers: new Map(),
      remoteStreams: new Map(),
      remoteScreenStreams: new Map(),
      remoteVideoStreams: new Map(),
      voiceUsers: [],
      localMuted: false,
      localDeafened: false,
      localSpeaking: false,
      localVideo: false,
      screenSharing: false,
      transport: null,
    });
  },

  setLocalStream: (stream) => set({ localStream: stream }),
  setLocalMuted: (muted) => {
    const { localStream } = get();
    localStream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    set({ localMuted: muted });
  },
  setLocalDeafened: (deafened) => {
    const { localStream, remoteStreams } = get();
    if (deafened) {
      localStream?.getAudioTracks().forEach(t => { t.enabled = false; });
      // Mute all remote audio elements
      remoteStreams.forEach(stream => {
        stream.getAudioTracks().forEach(t => { t.enabled = false; });
      });
    } else if (!get().localMuted) {
      localStream?.getAudioTracks().forEach(t => { t.enabled = true; });
      // Restore remote audio
      remoteStreams.forEach(stream => {
        stream.getAudioTracks().forEach(t => { t.enabled = true; });
      });
    }
    set({ localDeafened: deafened });
  },
  setLocalSpeaking: (speaking) => set({ localSpeaking: speaking }),
  setLocalVideo: (enabled) => set({ localVideo: enabled }),
  setScreenSharing: (enabled) => set({ screenSharing: enabled }),
  setLocalScreenStream: (stream) => set({ localScreenStream: stream }),
  setRemoteScreenStream: (socketId, stream) => {
    const remoteScreenStreams = new Map(get().remoteScreenStreams);
    remoteScreenStreams.set(socketId, stream);
    set({ remoteScreenStreams });
  },
  clearRemoteScreenStream: (socketId) => {
    const remoteScreenStreams = new Map(get().remoteScreenStreams);
    remoteScreenStreams.delete(socketId);
    set({ remoteScreenStreams });
  },
  setUserScreenSharing: (socketId, sharing) => set(state => {
    const existing = state.voiceUsers.find(u => u.socketId === socketId);
    if (existing) {
      return {
        voiceUsers: state.voiceUsers.map(u =>
          u.socketId === socketId ? { ...u, screenSharing: sharing } : u,
        ),
      };
    }
    // User not yet in voiceUsers — store the flag so ScreenShareOverlay can
    // pick it up, but don't create a fake "Unknown" stub. The real user
    // info will arrive via voice:user-joined shortly.
    return state;
  }),
  setRemoteVideoStream: (socketId, stream) => {
    const remoteVideoStreams = new Map(get().remoteVideoStreams);
    remoteVideoStreams.set(socketId, stream);
    set({ remoteVideoStreams });
  },
  clearRemoteVideoStream: (socketId) => {
    const remoteVideoStreams = new Map(get().remoteVideoStreams);
    remoteVideoStreams.delete(socketId);
    set({ remoteVideoStreams });
  },
  setJoinedAt: (ts) => set({ joinedAt: ts }),

  addPeer: (socketId, pc) => {
    const peers = new Map(get().peers);
    peers.set(socketId, pc);
    set({ peers });
  },

  removePeer: (socketId) => {
    const peers = new Map(get().peers);
    const remoteStreams = new Map(get().remoteStreams);
    const remoteScreenStreams = new Map(get().remoteScreenStreams);
    const remoteVideoStreams = new Map(get().remoteVideoStreams);
    peers.get(socketId)?.close();
    peers.delete(socketId);
    remoteStreams.delete(socketId);
    remoteScreenStreams.delete(socketId);
    remoteVideoStreams.delete(socketId);
    set({ peers, remoteStreams, remoteScreenStreams, remoteVideoStreams });
  },

  addRemoteStream: (socketId, stream) => {
    const remoteStreams = new Map(get().remoteStreams);
    remoteStreams.set(socketId, stream);
    set({ remoteStreams });
  },

  addVoiceUser: (user) => set(state => {
    if (state.voiceUsers.some(u => u.socketId === user.socketId)) return state;
    return { voiceUsers: [...state.voiceUsers, user] };
  }),

  removeVoiceUser: (socketId) => set(state => ({
    voiceUsers: state.voiceUsers.filter(u => u.socketId !== socketId),
  })),

  updateVoiceUser: (socketId, updates) => set(state => ({
    voiceUsers: state.voiceUsers.map(u =>
      u.socketId === socketId ? { ...u, ...updates } : u
    ),
  })),
  
  // Update amplitude for voice avatar rings
  setUserAmplitude: (socketId: string, amplitude: number) => set(state => ({
    voiceUsers: state.voiceUsers.map(u =>
      u.socketId === socketId ? { ...u, amplitude } : u
    ),
  })),

  // Spatial audio methods
  setUserSeatPosition: (userId: string, position: { x: number; y: number }) => set(state => ({
    seatPositions: {
      ...state.seatPositions,
      [userId]: position
    }
  })),

  clearSeatPositions: () => set({
    seatPositions: {}
  }),

  clearAll: () => {
    const { localStream, localScreenStream, peers, remoteVideoStreams } = get();
    localStream?.getTracks().forEach(t => t.stop());
    localScreenStream?.getTracks().forEach(t => t.stop());
    remoteVideoStreams.forEach(stream => stream.getTracks().forEach(t => t.stop()));
    peers.forEach(pc => pc.close());
    set({
      connected: false,
      channelId: null,
      serverId: null,
      joinedAt: null,
      localStream: null,
      localScreenStream: null,
      peers: new Map(),
      remoteStreams: new Map(),
      remoteScreenStreams: new Map(),
      remoteVideoStreams: new Map(),
      voiceUsers: [],
      localMuted: false,
      localDeafened: false,
      localSpeaking: false,
      localVideo: false,
      screenSharing: false,
      seatPositions: {},
      transport: null,
    });
  },
}));
