// Vox Mobile — Friends API

import { api } from './client';
import type { FriendRelationship } from '../types';

export async function fetchFriends(): Promise<FriendRelationship[]> {
  return api('/api/friends');
}

export async function sendFriendRequest(username: string): Promise<any> {
  return api('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function acceptFriend(id: string): Promise<any> {
  return api(`/api/friends/${id}/accept`, { method: 'PUT' });
}

export async function declineFriend(id: string): Promise<void> {
  return api(`/api/friends/${id}`, { method: 'DELETE' });
}

export async function blockUser(userId: string): Promise<any> {
  return api('/api/friends/block', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function unblockUser(userId: string): Promise<void> {
  return api(`/api/friends/block/${userId}`, { method: 'DELETE' });
}
