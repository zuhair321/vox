import { create } from 'zustand';
import { fetchServers } from '../api/servers';

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId?: string;
  topic?: string | null;
  nsfw?: boolean;
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
      // Keep selectedServer in sync: if we already have one, replace its data
      // with the freshly fetched copy (so icon/banner updates are visible immediately).
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
    } catch (e) {
      set({ loading: false });
    }
  },

  setSelectedServer: (server) => set({ selectedServer: server }),
  setSelectedChannel: (channel) => set({ selectedChannel: channel }),
  
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
  removeServer: (serverId) => set((state) => ({ 
    servers: state.servers.filter(s => s.id !== serverId),
    selectedServer: state.selectedServer?.id === serverId ? null : state.selectedServer
  })),
  
  addChannel: (serverId, channel) => set((state) => ({
    servers: state.servers.map(s => 
      s.id === serverId ? { ...s, channels: [...s.channels, channel] } : s
    ),
    selectedServer: state.selectedServer?.id === serverId 
      ? { ...state.selectedServer, channels: [...state.selectedServer.channels, channel] }
      : state.selectedServer
  })),

  updateChannel: (serverId, channelId, data) => set((state) => ({
    servers: state.servers.map(s =>
      s.id === serverId ? { ...s, channels: s.channels.map(c => c.id === channelId ? { ...c, ...data } : c) } : s
    ),
    selectedServer: state.selectedServer?.id === serverId
      ? { ...state.selectedServer, channels: state.selectedServer.channels.map(c => c.id === channelId ? { ...c, ...data } : c) }
      : state.selectedServer
  })),

  removeChannel: (serverId, channelId) => set((state) => ({
    servers: state.servers.map(s =>
      s.id === serverId ? { ...s, channels: s.channels.filter(c => c.id !== channelId) } : s
    ),
    selectedServer: state.selectedServer?.id === serverId
      ? { ...state.selectedServer, channels: state.selectedServer.channels.filter(c => c.id !== channelId) }
      : state.selectedServer
  })),

  updateMemberStatus: (userId, status) => set((state) => ({
    servers: state.servers.map(s => ({
      ...s,
      members: s.members.map(m => m.userId === userId ? { ...m, user: { ...m.user, status } } : m)
    })),
    selectedServer: state.selectedServer ? {
      ...state.selectedServer,
      members: state.selectedServer.members.map(m => m.userId === userId ? { ...m, user: { ...m.user, status } } : m)
    } : null
  })),

  // Tear down the prior session so the next user starts clean.
  reset: () => set({ servers: [], selectedServer: null, selectedChannel: null, loading: false }),
}));
