import { create } from 'zustand';
import { fetchServers } from '../api/servers';

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId?: string;
  topic?: string | null;
  nsfw?: boolean;
  categoryId?: string | null;
  position?: number;
  region?: string;
  slowmode?: number;
  rtcMode?: string;
  maxParticipants?: number;
  stageEnabled?: boolean;
}

export interface Category {
  id: string;
  name: string;
  position: number;
  serverId: string;
}

export interface ServerMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    status: string;
    avatarUrl?: string;
    role?: string;
  };
}

export interface Server {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  banner?: string | null;
  ownerId?: string;
  channels: Channel[];
  members: ServerMember[];
  verificationLevel?: string;
  vanityUrl?: string | null;
  createdAt?: string;
  categories?: any[];
  isPublic?: boolean;
  boosters?: string[];
  boosts?: number;
  category?: string;
  require2FA?: boolean;
  featured?: boolean;
  featuredOrder?: number;
  rulesScreening?: boolean;
  welcomeMessage?: string | null;
  welcomeChannels?: string | null;
  defaultChannelId?: string | null;
}

interface ServerStore {
  servers: Server[];
  selectedServer: Server | null;
  selectedChannel: Channel | null;
  loading: boolean;
  
  fetchServers: () => Promise<void>;
  setSelectedServer: (server: Server | null) => void;
  setSelectedChannel: (channel: Channel | null) => void;
  addServer: (server: Server) => void;
  removeServer: (serverId: string) => void;
  addChannel: (serverId: string, channel: Channel) => void;
  updateChannel: (serverId: string, channelId: string, data: Partial<Channel>) => void;
  removeChannel: (serverId: string, channelId: string) => void;
  updateMemberStatus: (userId: string, status: string) => void;
  reset: () => void;
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  selectedServer: null,
  selectedChannel: null,
  loading: false,

  fetchServers: async () => {
    set({ loading: true });
    try {
      const servers = await fetchServers();
      const currentId = get().selectedServer?.id;
      const updated = currentId
        ? servers.find((s: any) => s.id === currentId) || get().selectedServer
        : servers[0] || null;
      set({
        servers,
        loading: false,
        selectedServer: updated,
        selectedChannel: updated?.channels?.[0] || get().selectedChannel,
      });
    } catch (e: any) {
      set({ loading: false });
      console.error('[ServerStore] fetchServers failed:', e?.message || e);
    }
  },

  setSelectedServer: (server) => set({ selectedServer: server }),
  setSelectedChannel: (channel) => set({ selectedChannel: channel }),
  
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
  removeServer: (serverId) => set((state) => ({ 
    servers: state.servers.filter(s => s.id !== serverId),
    selectedServer: state.selectedServer?.id === serverId ? null : state.selectedServer
  })),
  
  addChannel: (serverId, channel) => set((state) => {
    const serverIndex = state.servers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) return state;
    const updatedServer = { ...state.servers[serverIndex], channels: [...state.servers[serverIndex].channels, channel] };
    const newServers = [...state.servers];
    newServers[serverIndex] = updatedServer;
    return {
      servers: newServers,
      selectedServer: state.selectedServer?.id === serverId ? updatedServer : state.selectedServer
    };
  }),

  updateChannel: (serverId, channelId, data) => set((state) => {
    const serverIndex = state.servers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) return state;
    const updatedChannels = state.servers[serverIndex].channels.map(c => c.id === channelId ? { ...c, ...data } : c);
    const updatedServer = { ...state.servers[serverIndex], channels: updatedChannels };
    const newServers = [...state.servers];
    newServers[serverIndex] = updatedServer;
    return {
      servers: newServers,
      selectedServer: state.selectedServer?.id === serverId ? updatedServer : state.selectedServer
    };
  }),

  removeChannel: (serverId, channelId) => set((state) => {
    const serverIndex = state.servers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) return state;
    const updatedChannels = state.servers[serverIndex].channels.filter(c => c.id !== channelId);
    const updatedServer = { ...state.servers[serverIndex], channels: updatedChannels };
    const newServers = [...state.servers];
    newServers[serverIndex] = updatedServer;
    return {
      servers: newServers,
      selectedServer: state.selectedServer?.id === serverId ? updatedServer : state.selectedServer
    };
  }),

  updateMemberStatus: (userId, status) => set((state) => {
    const updateMember = (members: ServerMember[]) => members.map((m: ServerMember) => m.userId === userId ? { ...m, user: { ...m.user, status } } : m);
    const selectedServerIndex = state.selectedServer ? state.servers.findIndex((s: Server) => s.id === state.selectedServer!.id) : -1;
    const newServers = state.servers.map((s: Server) => ({ ...s, members: updateMember(s.members) }));
    const selectedServer = selectedServerIndex >= 0 ? { ...newServers[selectedServerIndex], members: updateMember(newServers[selectedServerIndex].members) } : state.selectedServer;
    return { servers: newServers, selectedServer };
  }),

  // Tear down the prior session so the next user starts clean.
  reset: () => set({ servers: [], selectedServer: null, selectedChannel: null, loading: false }),
}));
