// Vox Mobile — Friend store

import { create } from 'zustand';
import * as friendsApi from '../api/friends';
import type { FriendRelationship, PublicUser } from '../types';

interface FriendState {
  friends: PublicUser[];
  incoming: FriendRelationship[];
  outgoing: FriendRelationship[];
  blocked: PublicUser[];
  isLoading: boolean;

  // Actions
  fetchFriends: () => Promise<void>;
  sendRequest: (username: string) => Promise<void>;
  accept: (id: string) => Promise<void>;
  decline: (id: string) => Promise<void>;
  block: (userId: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
  isLoading: false,

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const relationships = await friendsApi.fetchFriends();
      // We need the current user ID to determine direction — store it from the first relationship
      // For now, we'll separate by status
      const accepted: PublicUser[] = [];
      const incoming: FriendRelationship[] = [];
      const outgoing: FriendRelationship[] = [];
      const blocked: PublicUser[] = [];

      for (const rel of relationships) {
        if (rel.status === 'accepted') {
          // The "other" user is the friend
          accepted.push(rel.friend);
        } else if (rel.status === 'pending') {
          // We'll determine direction in the component using current user ID
          incoming.push(rel);
        } else if (rel.status === 'blocked') {
          blocked.push(rel.friend);
        }
      }

      set({ friends: accepted, incoming, outgoing, blocked, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  sendRequest: async (username) => {
    await friendsApi.sendFriendRequest(username);
    await get().fetchFriends();
  },

  accept: async (id) => {
    await friendsApi.acceptFriend(id);
    await get().fetchFriends();
  },

  decline: async (id) => {
    await friendsApi.declineFriend(id);
    await get().fetchFriends();
  },

  block: async (userId) => {
    await friendsApi.blockUser(userId);
    await get().fetchFriends();
  },

  unblock: async (userId) => {
    await friendsApi.unblockUser(userId);
    await get().fetchFriends();
  },

  reset: () => set({ friends: [], incoming: [], outgoing: [], blocked: [], isLoading: false }),
}));
