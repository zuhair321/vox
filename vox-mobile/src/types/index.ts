// Vox Mobile — TypeScript types matching backend API shapes

export type UserStatus = 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
export type ChannelType = 'TEXT' | 'VOICE';
export type FriendStatus = 'pending' | 'accepted' | 'blocked';
export type MemberRole = 'FOUNDER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  color: string;
  status: UserStatus;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  color: string;
  status: UserStatus;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  role?: string;
}

export interface Server {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  banner: string | null;
  ownerId: string;
  category: string;
  isPublic: boolean;
  channels: Channel[];
  members: ServerMember[];
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  topic: string | null;
  position: number;
  serverId?: string;
  categoryId?: string | null;
  nsfw?: boolean;
  slowmode?: number;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  role: MemberRole;
  nick: string | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    status: UserStatus;
    avatarUrl: string | null;
    color: string;
  };
}

export interface Message {
  id: string;
  channelId: string;
  userId: string | null;
  authorOverride: string | null;
  body: string;
  edited: boolean;
  deleted: boolean;
  pinned: boolean;
  parentId: string | null;
  attachments: Attachment[];
  createdAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    status: UserStatus;
    avatarUrl: string | null;
    color: string;
    role?: string;
  };
  reactions?: Record<string, number>;
}

export interface DMMessage {
  id: string;
  content: string;
  dmId: string;
  senderId: string;
  recipientId: string;
  read: boolean;
  edited: boolean;
  deleted: boolean;
  attachments: Attachment[];
  createdAt: string;
  sender?: PublicUser;
  recipient?: PublicUser;
}

export interface Attachment {
  url: string;
  kind: 'image' | 'video' | 'file';
  name: string;
  size: number;
  mime: string;
}

export interface FriendRelationship {
  id: string;
  userId: string;
  friendId: string;
  status: FriendStatus;
  user: PublicUser;
  friend: PublicUser;
}

export interface Category {
  id: string;
  name: string;
  position: number;
  serverId: string;
}

export interface Invite {
  code: string;
  serverId: string;
  creatorId: string;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface TwoFactorChallenge {
  twoFactorRequired: true;
  tempToken: string;
}

export interface VoicePeer {
  socketId: string;
  userId: string;
  username: string;
  isScreenSharing: boolean;
}
