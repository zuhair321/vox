import { create } from 'zustand';
import { fetchFriends, sendFriendRequest, acceptFriendRequest, declineOrRemoveFriend, blockUser, unblockUser } from '../api/friends';

export interface User {
  id: string;
  username: string;
  status: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  displayName?: string;
  color?: string;
}

export interface FriendRelationship {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  user: User;
  friend: User;
}

interface FriendStore {
  friends: User[];
  incoming: FriendRelationship[];
  outgoing: FriendRelationship[];
  blocked: User[];
  loading: boolean;
  
  fetchFriends: () => Promise<void>;
  sendRequest: (username: string) => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  declineRequest: (id: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  markAllAsRead: () => void;
  reset: () => void;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
  loading: false,

  fetchFriends: async () => {
    set({ loading: true });
    try {
      const data: FriendRelationship[] = await fetchFriends();
      const myId = JSON.parse(localStorage.getItem('vox_user') || '{}').id;
      
      const friends = data.filter(r => r.status === 'accepted').map(r => r.userId === myId ? r.friend : r.user);
      const incoming = data.filter(r => r.status === 'pending' && r.friendId === myId);
      const outgoing = data.filter(r => r.status === 'pending' && r.userId === myId);
      const blocked = data.filter(r => r.status === 'blocked').map(r => r.userId === myId ? r.friend : r.user);

      set({ friends, incoming, outgoing, blocked, loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  sendRequest: async (username) => {
    await sendFriendRequest(username);
    await get().fetchFriends();
  },

  acceptRequest: async (id) => {
    await acceptFriendRequest(id);
    await get().fetchFriends();
  },

  declineRequest: async (id) => {
    await declineOrRemoveFriend(id);
    await get().fetchFriends();
  },

  cancelRequest: async (id) => {
    await declineOrRemoveFriend(id);
    await get().fetchFriends();
  },

  removeFriend: async (id) => {
    await declineOrRemoveFriend(id);
    await get().fetchFriends();
  },

  blockUser: async (userId) => {
    await blockUser(userId);
    await get().fetchFriends();
  },

  unblockUser: async (userId) => {
    // Previously this only refetched and never hit the API, so unblocking a
    // user silently did nothing. Call the unblock endpoint, then refresh.
    await unblockUser(userId);
    await get().fetchFriends();
  },

  // Tear down the prior session so the next user starts clean.
  reset: () => set({ friends: [], incoming: [], outgoing: [], blocked: [], loading: false }),

  // Optimistically mark all pending requests as "seen". Since the backend has no
  // per-request read flag, this is a purely local UX improvement.
  markAllAsRead: () => {
    // No-op for now — can be wired to a backend endpoint if one gets added.
  },
}));
