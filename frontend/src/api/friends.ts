import { api } from './client';

export const fetchFriends = () => api('/api/friends');

export const sendFriendRequest = (username: string) =>
  api('/api/friends/request', {
    method: 'POST',
    body: JSON.stringify({ username })
  });

export const acceptFriendRequest = (id: string) =>
  api(`/api/friends/${id}/accept`, {
    method: 'PUT'
  });

export const declineOrRemoveFriend = (id: string) =>
  api(`/api/friends/${id}`, {
    method: 'DELETE'
  });

export const blockUser = (userId: string) =>
  api('/api/friends/block', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });

export const unblockUser = (userId: string) =>
  api(`/api/friends/block/${userId}`, {
    method: 'DELETE'
  });
