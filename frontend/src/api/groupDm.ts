// ═══════════════════════════════════════════════════════════════
// VOX — Group DM API
// ═══════════════════════════════════════════════════════════════
import { API_BASE } from './client';

async function api(method: string, path: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface GroupDmMember {
  id: string;
  userId: string;
  nickname?: string;
  joinedAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string; status: string };
}

export interface GroupDm {
  id: string;
  name?: string;
  icon?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: GroupDmMember[];
  lastMessage?: { content?: string; sender: { username: string }; createdAt: string };
}

export interface GroupDmMessage {
  id: string;
  content?: string;
  groupDmId: string;
  senderId: string;
  createdAt: string;
  edited: boolean;
  sender: { id: string; username: string; displayName: string; avatarUrl?: string };
}

export async function createGroupDm(name: string | null, memberIds: string[]): Promise<{ groupDm: GroupDm }> {
  return api('POST', '/api/group-dms', { name, memberIds });
}

export async function listGroupDms(): Promise<{ groupDms: GroupDm[] }> {
  return api('GET', '/api/group-dms');
}

export async function getGroupDm(id: string): Promise<{ groupDm: GroupDm }> {
  return api('GET', `/api/group-dms/${id}`);
}

export async function sendGroupDmMessage(id: string, content: string, attachments?: string[]): Promise<{ message: GroupDmMessage }> {
  return api('POST', `/api/group-dms/${id}/messages`, { content, attachments });
}

export async function getGroupDmMessages(id: string, before?: string, limit?: number): Promise<{ messages: GroupDmMessage[] }> {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  if (limit) params.set('limit', String(limit));
  return api('GET', `/api/group-dms/${id}/messages?${params}`);
}

export async function addGroupDmMember(id: string, userId: string): Promise<{ member: GroupDmMember }> {
  return api('POST', `/api/group-dms/${id}/members`, { userId });
}

export async function leaveGroupDm(id: string): Promise<{ left: boolean }> {
  return api('DELETE', `/api/group-dms/${id}/members/me`);
}
