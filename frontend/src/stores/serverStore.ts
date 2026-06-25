import { create } from 'zustand';
import { fetchServers } from '../api/servers';

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId?: string;
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
  };
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
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
  updateMemberStatus: (userId: string, status: string) => void;
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
      set({ servers, loading: false });
      if (servers.length > 0 && !get().selectedServer) {
        set({ selectedServer: servers[0] });
        if (servers[0].channels.length > 0) {
          set({ selectedChannel: servers[0].channels[0] });
        }
      }
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

  updateMemberStatus: (userId, status) => set((state) => ({
    servers: state.servers.map(s => ({
      ...s,
      members: s.members.map(m => m.userId === userId ? { ...m, user: { ...m.user, status } } : m)
    })),
    selectedServer: state.selectedServer ? {
      ...state.selectedServer,
      members: state.selectedServer.members.map(m => m.userId === userId ? { ...m, user: { ...m.user, status } } : m)
    } : null
  }))
}));
