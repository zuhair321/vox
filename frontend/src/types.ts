export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';
export type UserRole = 'Founder' | 'Admin' | 'Moderator' | 'Member';

// A chat attachment. `kind` drives how the client renders it:
//   image  → inline <img>
//   video  → <video controls>
//   file   → a download chip
// `url` is a backend-relative path (e.g. /uploads/chat-<id>-<ts>.mp4) —
// prepend API_BASE to load it.
export type AttachmentKind = 'image' | 'video' | 'file';

export interface Attachment {
  url: string;
  kind: AttachmentKind;
  name: string;
  size: number;
  mime: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  activity?: string;
  role?: UserRole;
  hasTurbo?: boolean;
  turboSince?: string | null;
}

export interface Server {
  id: string;
  name: string;
  icon: string | null;
  badgeCount?: number;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  locked?: boolean;
  activeUsers?: User[];
  timer?: string;
}

export interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: string;
  isGif?: boolean;
  gifData?: {
    url: string;
    caption?: string;
  };
  mentions?: string[];
  isConsecutive?: boolean;
  dateDivider?: string;
}
