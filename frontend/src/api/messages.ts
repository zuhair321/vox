import { api } from './client';
import type { Attachment } from '../types';

export const fetchMessages = (channelId: string, before?: string) =>
  api(`/api/channels/${channelId}/messages${before ? '?before=' + before : ''}`);

export const sendMessageHTTP = (
  channelId: string,
  content: string,
  parentId?: string,
  attachments?: Attachment[],
) =>
  api(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, parentId, channelId, attachments })
  });

// Read receipts
export interface MessageReadUser {
  userId: string;
  username: string;
  avatar: string | null;
  status: string;
  readAt: string;
}

export const markMessageRead = (messageId: string) =>
  api(`/api/messages/${messageId}/read`, { method: 'POST' });

export const getMessageReads = (messageId: string) =>
  api(`/api/messages/${messageId}/read`) as Promise<{ reads: MessageReadUser[] }>;


// ── Threads (Discord-style persistent threads) ──────────────────────
// Used by ThreadPanel + ThreadIndicator + MessageBubble for live state.

export interface ThreadSummary {
  message: any;
  replyCount: number;
  lastReplyAt: string | null;
  lastReplyAuthor?: string | null;
  unreadCount: number;
  hasMore: boolean;
}

/** Fetch a single message plus its reply aggregate (count, last reply, unread). */
export const fetchThreadSummary = (messageId: string) =>
  api(`/api/messages/${messageId}`) as Promise<ThreadSummary>;

/** Fetch a paginated slice of replies for a parent message. */
export const fetchThreadReplies = (parentId: string, before?: string, limit = 50) =>
  api(
    `/api/messages/${parentId}/replies?` +
    (before ? `before=${encodeURIComponent(before)}&` : "") +
    `limit=${limit}`,
  ) as Promise<{ replies: any[]; hasMore: boolean }>;

/** Mark a thread read up to and including the given reply id (idempotent). */
export const markThreadRead = (parentId: string, seenMessageId: string) =>
  api(`/api/messages/${parentId}/thread/mark-read`, {
    method: "POST",
    body: JSON.stringify({ messageId: seenMessageId }),
  }) as Promise<{ ok: true; readAt: string }>;

// Edit history endpoint.

export async function fetchMessageHistory(messageId: string): Promise<any[]> {
  const j = await api<any>(`/api/messages/${encodeURIComponent(messageId)}/history`, { method: 'GET' });
  return (j && j.history) || [];
}
