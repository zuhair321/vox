import { api } from './client';

export interface ForumPost {
  id: string;
  body: string;
  tags?: string[];
  createdAt: string;
  edited?: boolean;
  author?: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  reactions?: any[];
  _count?: { threadMessages: number };
}

export interface ForumReply {
  id: string;
  body: string;
  createdAt: string;
  author?: { id: string; username: string; displayName: string; avatarUrl?: string | null };
}

export const fetchForumPosts = (channelId: string) =>
  api<{ posts: ForumPost[] }>(`/api/channels/${channelId}/forum-posts`);

export const createForumPost = (channelId: string, content: string, tags?: string[]) =>
  api<{ post: ForumPost }>(`/api/channels/${channelId}/forum-posts`, {
    method: 'POST',
    body: JSON.stringify({ content, tags }),
  });

export const fetchForumPost = (postId: string) =>
  api<{ post: ForumPost; replies: ForumReply[] }>(`/api/forum-posts/${postId}`);

export const replyToForumPost = (postId: string, content: string) =>
  api<{ reply: ForumReply }>(`/api/forum-posts/${postId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

export const deleteForumPost = (postId: string) =>
  api(`/api/forum-posts/${postId}`, { method: 'DELETE' });
