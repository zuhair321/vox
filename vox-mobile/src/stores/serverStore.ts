// Vox Mobile — Server store

import { create } from 'zustand';
import * as serversApi from '../api/servers';
import type { Server, Channel, ServerMember } from '../types';

interface ServerState {
  servers: Server[];
  selectedServer: Server | null;
  selectedChannel: Channel | null;
  isLoading: boolean;

  // Actions
  fetchServers: () => Promise<void>;
  selectServer: (server: Server | null) => void;
  selectChannel: (channel: Channel | null) => void;
  updateMemberStatus: (userId: string, status: string) => void;
  createServer: (data: { name: string; description?: string; isPublic?: boolean }) => Promise<Server>;
  reset: () => void;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  selectedServer: null,
  selectedChannel: null,
  isLoading: false,

  fetchServers: async () => {
    set({ isLoading: true });
    try {
      const servers = await serversApi.fetchServers();
      set({ servers, isLoading: false });

      // Keep selected server in sync
      const { selectedServer } = get();
      if (selectedServer) {
        const updated = servers.find(s => s.id === selectedServer.id);
        if (updated) {
          set({ selectedServer: updated });
        }
      }
    } catch {
      set({ isLoading: false });
    }
  },

  selectServer: (server) => set({ selectedServer: server, selectedChannel: null }),

  selectChannel: (channel) => set({ selectedChannel: channel }),

  updateMemberStatus: (userId, status) => {
    const { servers, selectedServer } = get();
    const updateMembers = (members: ServerMember[]): ServerMember[] =>
      members.map(m =>
        m.userId === userId
          ? { ...m, user: { ...m.user, status: status as any } }
          : m
      );

    const newServers = servers.map(s => ({
      ...s,
      members: updateMembers(s.members),
    }));

    const newSelected = selectedServer
      ? { ...selectedServer, members: updateMembers(selectedServer.members) }
      : null;

    set({ servers: newServers, selectedServer: newSelected });
  },

  createServer: async (data) => {
    const server = await serversApi.createServer(data);
    set(state => ({ servers: [...state.servers, server] }));
    return server;
  },

  reset: () => set({ servers: [], selectedServer: null, selectedChannel: null, isLoading: false }),
}));
