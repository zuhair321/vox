import { api } from './client';

export interface PollOption {
  id: string;
  text: string;
  votes: { id: string; userId: string }[];
}

export interface Poll {
  id: string;
  channelId: string;
  userId: string;
  question: string;
  options: PollOption[];
  ended: boolean;
  maxVotes: number;
  createdAt: string;
  expiresAt: string | null;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

export const fetchPolls = (channelId: string) =>
  api(`/api/channels/${channelId}/polls`) as Promise<Poll[]>;

export const createPoll = (channelId: string, question: string, options: string[], maxVotes = 1, expiresAt?: string) =>
  api(`/api/channels/${channelId}/polls`, {
    method: 'POST',
    body: JSON.stringify({ question, options, maxVotes, expiresAt }),
  }) as Promise<Poll>;

export const votePoll = (pollId: string, optionIds: string[]) =>
  api(`/api/polls/${pollId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ optionIds }),
  }) as Promise<Poll>;

export const endPoll = (pollId: string) =>
  api(`/api/polls/${pollId}/end`, { method: 'POST' }) as Promise<Poll>;
