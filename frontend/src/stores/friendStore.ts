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
  hasTurbo?: boolean;
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
    } catch (e: any) {
      set({ loading: false });
      console.error('[FriendStore] fetchFriends failed:', e?.message || e);
    }
  },

  sendRequest: async (username) => {
    await sendFriendRequest(username);
    set((state) => ({ outgoing: [...state.outgoing, { id: Date.now().toString(), userId: '', friendId: '', status: 'pending', user: { id: '', username, status: 'offline', avatarUrl: '' }, friend: { id: '', username, status: 'offline', avatarUrl: '' } }] }));
  },

  acceptRequest: async (id) => {
    await acceptFriendRequest(id);
    set((state) => {
      const request = state.incoming.find(r => r.id === id);
      const newFriend = request?.user.id === state.friends[0]?.id ? request?.friend : request?.user;
      return { 
        incoming: state.incoming.filter(r => r.id !== id),
        friends: newFriend ? [...state.friends, newFriend] : state.friends
      };
    });
  },

  declineRequest: async (id) => {
    await declineOrRemoveFriend(id);
    set((state) => ({ incoming: state.incoming.filter(r => r.id !== id) }));
  },

  cancelRequest: async (id) => {
    await declineOrRemoveFriend(id);
    set((state) => ({ outgoing: state.outgoing.filter(r => r.id !== id) }));
  },

  removeFriend: async (id) => {
    await declineOrRemoveFriend(id);
    set((state) => ({ friends: state.friends.filter(f => f.id !== id) }));
  },

  blockUser: async (userId) => {
    await blockUser(userId);
    set((state) => ({ 
      friends: state.friends.filter(f => f.id !== userId),
      blocked: [...state.blocked, state.friends.find(f => f.id === userId)].filter((b): b is User => !!b)
    }));
  },

  unblockUser: async (userId) => {
    await unblockUser(userId);
    set((state) => ({ blocked: state.blocked.filter(f => f.id !== userId) }));
  },

  // Tear down the prior session so the next user starts clean.
  reset: () => set({ friends: [], incoming: [], outgoing: [], blocked: [], loading: false }),

  // Optimistically mark all pending requests as "seen". Since the backend has no
  // per-request read flag, this is a purely local UX improvement.
  markAllAsRead: () => {
    // No-op for now — can be wired to a backend endpoint if one gets added.
  },
}));
