-- Migration: 20250708210000_initial_schema
-- VOX backend — full schema baseline (PostgreSQL)
-- Run with: npx prisma migrate deploy

-- ── User ──────────────────────────────────────────────────────────
CREATE TABLE "User" (
  "id" varchar(191) NOT NULL,
  "email" varchar(191) NOT NULL,
  "username" varchar(191) NOT NULL,
  "displayName" varchar(191) NOT NULL,
  "passwordHash" varchar(191) NOT NULL,
  "role" varchar(191) NOT NULL DEFAULT 'MEMBER',
  "color" varchar(191) NOT NULL DEFAULT '#5865f2',
  "status" varchar(191) NOT NULL DEFAULT 'OFFLINE',
  "activity" varchar(191) DEFAULT NULL,
  "twoFactorSecret" varchar(191) DEFAULT NULL,
  "twoFactorEnabled" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  "avatarUrl" varchar(191) DEFAULT NULL,
  "bannerUrl" varchar(191) DEFAULT NULL,
  "bio" varchar(191) DEFAULT NULL,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "loginAttempts" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamp(3) DEFAULT NULL,
  "lastLoginAt" timestamp(3) DEFAULT NULL,
  "hasTurbo" boolean NOT NULL DEFAULT true,
  "turboSince" timestamp(3) DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- ── Server ────────────────────────────────────────────────────────
CREATE TABLE "Server" (
  "id" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "description" varchar(191) DEFAULT NULL,
  "icon" varchar(191) DEFAULT NULL,
  "banner" varchar(191) DEFAULT NULL,
  "category" varchar(191) NOT NULL DEFAULT 'COMMUNITY',
  "isPublic" boolean NOT NULL DEFAULT false,
  "verificationLevel" varchar(191) NOT NULL DEFAULT 'NONE',
  "vanityUrl" varchar(191) DEFAULT NULL,
  "defaultChannelId" varchar(191) DEFAULT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId" varchar(191) NOT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE INDEX "Server_ownerId_fkey" ON "Server"("ownerId");

-- ── Channel ───────────────────────────────────────────────────────
CREATE TABLE "Channel" (
  "id" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "topic" varchar(191) NOT NULL DEFAULT '',
  "type" varchar(191) NOT NULL DEFAULT 'TEXT',
  "position" integer NOT NULL DEFAULT 0,
  "nsfw" boolean NOT NULL DEFAULT false,
  "slowmode" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categoryId" varchar(191) DEFAULT NULL,
  "serverId" varchar(191) DEFAULT NULL,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE INDEX "Channel_serverId_fkey" ON "Channel"("serverId");
CREATE INDEX "Channel_categoryId_fkey" ON "Channel"("categoryId");

-- ── Message ───────────────────────────────────────────────────────
CREATE TABLE "Message" (
  "id" varchar(191) NOT NULL,
  "channelId" varchar(191) NOT NULL,
  "userId" varchar(191) DEFAULT NULL,
  "authorOverride" varchar(191) DEFAULT NULL,
  "body" varchar(191) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attachments" jsonb DEFAULT NULL,
  "deleted" boolean NOT NULL DEFAULT false,
  "edited" boolean NOT NULL DEFAULT false,
  "parentId" varchar(191) DEFAULT NULL,
  "pinned" boolean NOT NULL DEFAULT false,
  "fuseTime" timestamp(3) DEFAULT NULL,
  PRIMARY KEY ("id")
);
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId","createdAt");
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
CREATE INDEX "Message_parentId_idx" ON "Message"("parentId");

-- ── DmMessage ─────────────────────────────────────────────────────
CREATE TABLE "DmMessage" (
  "id" varchar(191) NOT NULL,
  "content" varchar(191) NOT NULL,
  "attachments" jsonb DEFAULT NULL,
  "dmId" varchar(191) NOT NULL,
  "senderId" varchar(191) NOT NULL,
  "recipientId" varchar(191) NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "edited" boolean NOT NULL DEFAULT false,
  "deleted" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("id")
);
CREATE INDEX "DmMessage_dmId_createdAt_idx" ON "DmMessage"("dmId","createdAt");
CREATE INDEX "DmMessage_recipientId_read_idx" ON "DmMessage"("recipientId","read");
CREATE INDEX "DmMessage_senderId_createdAt_idx" ON "DmMessage"("senderId","createdAt");

-- ── Friend ────────────────────────────────────────────────────────
CREATE TABLE "Friend" (
  "id" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "friendId" varchar(191) NOT NULL,
  "status" varchar(191) NOT NULL DEFAULT 'pending',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Friend_userId_friendId_key" ON "Friend"("userId","friendId");
CREATE INDEX "Friend_userId_status_idx" ON "Friend"("userId","status");
CREATE INDEX "Friend_friendId_status_idx" ON "Friend"("friendId","status");

-- ── ServerMember ──────────────────────────────────────────────────
CREATE TABLE "ServerMember" (
  "id" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "role" varchar(191) NOT NULL DEFAULT 'MEMBER',
  "nick" varchar(191) DEFAULT NULL,
  "joinedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mutedUntil" timestamp(3) DEFAULT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServerMember_serverId_userId_key" ON "ServerMember"("serverId","userId");
CREATE INDEX "ServerMember_userId_idx" ON "ServerMember"("userId");

-- ── Invite ────────────────────────────────────────────────────────
CREATE TABLE "Invite" (
  "id" varchar(191) NOT NULL,
  "code" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "creatorId" varchar(191) NOT NULL,
  "maxUses" integer NOT NULL DEFAULT 0,
  "uses" integer NOT NULL DEFAULT 0,
  "expiresAt" timestamp(3) DEFAULT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
CREATE INDEX "Invite_serverId_fkey" ON "Invite"("serverId");
CREATE INDEX "Invite_creatorId_fkey" ON "Invite"("creatorId");

-- ── ServerBan ─────────────────────────────────────────────────────
CREATE TABLE "ServerBan" (
  "id" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "reason" varchar(191) DEFAULT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" timestamp(3) DEFAULT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServerBan_serverId_userId_key" ON "ServerBan"("serverId","userId");
CREATE INDEX "ServerBan_userId_fkey" ON "ServerBan"("userId");

-- ── AuditLog ──────────────────────────────────────────────────────
CREATE TABLE "AuditLog" (
  "id" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "action" varchar(191) NOT NULL,
  "targetId" varchar(191) DEFAULT NULL,
  "details" jsonb DEFAULT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_serverId_createdAt_idx" ON "AuditLog"("serverId","createdAt");
CREATE INDEX "AuditLog_userId_fkey" ON "AuditLog"("userId");

-- ── Category ──────────────────────────────────────────────────────
CREATE TABLE "Category" (
  "id" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "serverId" varchar(191) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "Category_serverId_fkey" ON "Category"("serverId");

-- ── Permission ────────────────────────────────────────────────────
CREATE TABLE "Permission" (
  "id" varchar(191) NOT NULL,
  "channelId" varchar(191) NOT NULL,
  "role" varchar(191) NOT NULL,
  "canRead" boolean NOT NULL DEFAULT true,
  "canWrite" boolean NOT NULL DEFAULT true,
  "canManage" boolean NOT NULL DEFAULT false,
  "canAdmin" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Permission_channelId_role_key" ON "Permission"("channelId","role");

-- ── Reaction ──────────────────────────────────────────────────────
CREATE TABLE "Reaction" (
  "id" varchar(191) NOT NULL,
  "messageId" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "emoji" varchar(191) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Reaction_messageId_userId_emoji_key" ON "Reaction"("messageId","userId","emoji");
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");

-- ── RefreshToken ──────────────────────────────────────────────────
CREATE TABLE "RefreshToken" (
  "id" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "tokenHash" varchar(191) NOT NULL,
  "revoked" boolean NOT NULL DEFAULT false,
  "expiresAt" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceInfo" varchar(191) DEFAULT NULL,
  "ipAddress" varchar(191) DEFAULT NULL,
  "userAgent" varchar(191) DEFAULT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_fkey" ON "RefreshToken"("userId");

-- ── PasswordReset ─────────────────────────────────────────────────
CREATE TABLE "PasswordReset" (
  "id" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "tokenHash" varchar(191) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX "PasswordReset_userId_fkey" ON "PasswordReset"("userId");

-- ── Block ─────────────────────────────────────────────────────────
CREATE TABLE "Block" (
  "id" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "blockedId" varchar(191) NOT NULL,
  "reason" varchar(191) DEFAULT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Block_userId_blockedId_key" ON "Block"("userId","blockedId");
CREATE INDEX "Block_blockedId_fkey" ON "Block"("blockedId");
CREATE INDEX "Block_userId_fkey" ON "Block"("userId");

-- ── Webhook ───────────────────────────────────────────────────────
CREATE TABLE "Webhook" (
  "id" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "channelId" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "avatarUrl" varchar(191) DEFAULT NULL,
  "url" varchar(191) DEFAULT NULL,
  "token" varchar(191) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Webhook_token_key" ON "Webhook"("token");
CREATE INDEX "Webhook_serverId_fkey" ON "Webhook"("serverId");
CREATE INDEX "Webhook_channelId_fkey" ON "Webhook"("channelId");

-- ── CustomEmoji ───────────────────────────────────────────────────
CREATE TABLE "CustomEmoji" (
  "id" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "url" varchar(191) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomEmoji_serverId_name_key" ON "CustomEmoji"("serverId","name");

-- ── Report ────────────────────────────────────────────────────────
CREATE TABLE "Report" (
  "id" varchar(191) NOT NULL,
  "reporterId" varchar(191) NOT NULL,
  "reportedUserId" varchar(191) DEFAULT NULL,
  "messageId" varchar(191) DEFAULT NULL,
  "serverId" varchar(191) DEFAULT NULL,
  "type" varchar(191) NOT NULL,
  "reason" varchar(191) NOT NULL,
  "details" text DEFAULT NULL,
  "status" varchar(191) NOT NULL DEFAULT 'pending',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "Report_reporterId_fkey" ON "Report"("reporterId");
CREATE INDEX "Report_reportedUserId_fkey" ON "Report"("reportedUserId");

-- ── ServerRole ────────────────────────────────────────────────────
CREATE TABLE "ServerRole" (
  "id" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "color" varchar(191) NOT NULL DEFAULT '#5865f2',
  "hoist" boolean NOT NULL DEFAULT false,
  "mentionable" boolean NOT NULL DEFAULT false,
  "position" integer NOT NULL DEFAULT 0,
  "permissions" bigint NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServerRole_serverId_name_key" ON "ServerRole"("serverId","name");

-- ── ServerMemberRole ──────────────────────────────────────────────
CREATE TABLE "ServerMemberRole" (
  "id" varchar(191) NOT NULL,
  "serverMemberId" varchar(191) NOT NULL,
  "roleId" varchar(191) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "ServerMemberRole_serverMemberId_idx" ON "ServerMemberRole"("serverMemberId");
CREATE INDEX "ServerMemberRole_roleId_idx" ON "ServerMemberRole"("roleId");

-- ── MessageRead ───────────────────────────────────────────────────
CREATE TABLE "MessageRead" (
  "id" varchar(191) NOT NULL,
  "messageId" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "readAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId","userId");
CREATE INDEX "MessageRead_messageId_idx" ON "MessageRead"("messageId");
CREATE INDEX "MessageRead_userId_idx" ON "MessageRead"("userId");

-- ── UserNote ──────────────────────────────────────────────────────
CREATE TABLE "UserNote" (
  "id" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "targetId" varchar(191) NOT NULL,
  "content" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserNote_userId_targetId_key" ON "UserNote"("userId","targetId");
CREATE INDEX "UserNote_targetId_fkey" ON "UserNote"("targetId");

-- ── ScheduledMessage ──────────────────────────────────────────────
CREATE TABLE "ScheduledMessage" (
  "id" varchar(191) NOT NULL,
  "channelId" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "body" varchar(191) NOT NULL,
  "attachments" jsonb DEFAULT NULL,
  "scheduledAt" timestamp(3) NOT NULL,
  "sent" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "ScheduledMessage_scheduledAt_sent_idx" ON "ScheduledMessage"("scheduledAt","sent");
CREATE INDEX "ScheduledMessage_channelId_fkey" ON "ScheduledMessage"("channelId");
CREATE INDEX "ScheduledMessage_userId_fkey" ON "ScheduledMessage"("userId");

-- ── ServerTemplate ────────────────────────────────────────────────
CREATE TABLE "ServerTemplate" (
  "id" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "description" varchar(191) DEFAULT NULL,
  "ownerId" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "data" jsonb NOT NULL,
  "uses" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "ServerTemplate_ownerId_idx" ON "ServerTemplate"("ownerId");
CREATE INDEX "ServerTemplate_serverId_fkey" ON "ServerTemplate"("serverId");

-- ── ApiKey ────────────────────────────────────────────────────────
CREATE TABLE "ApiKey" (
  "id" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "name" varchar(191) NOT NULL,
  "keyHash" varchar(191) NOT NULL,
  "keyPrefix" varchar(191) NOT NULL,
  "scopes" varchar(191) NOT NULL DEFAULT '*',
  "lastUsed" timestamp(3) DEFAULT NULL,
  "expiresAt" timestamp(3) DEFAULT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- ── PinNotification ───────────────────────────────────────────────
CREATE TABLE "PinNotification" (
  "id" varchar(191) NOT NULL,
  "channelId" varchar(191) NOT NULL,
  "messageId" varchar(191) NOT NULL,
  "pinnedBy" varchar(191) NOT NULL,
  "userId" varchar(191) NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE INDEX "PinNotification_userId_read_idx" ON "PinNotification"("userId","read");
CREATE INDEX "PinNotification_channelId_fkey" ON "PinNotification"("channelId");
CREATE INDEX "PinNotification_messageId_fkey" ON "PinNotification"("messageId");
CREATE INDEX "PinNotification_pinnedBy_fkey" ON "PinNotification"("pinnedBy");
CREATE INDEX "PinNotification_userId_fkey" ON "PinNotification"("userId");

-- ── ChannelArchiveConfig ──────────────────────────────────────────
CREATE TABLE "ChannelArchiveConfig" (
  "id" varchar(191) NOT NULL,
  "channelId" varchar(191) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "daysToKeep" integer NOT NULL DEFAULT 90,
  "lastArchivedAt" timestamp(3) DEFAULT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChannelArchiveConfig_channelId_key" ON "ChannelArchiveConfig"("channelId");

-- ── ServerStats ───────────────────────────────────────────────────
CREATE TABLE "ServerStats" (
  "id" varchar(191) NOT NULL,
  "serverId" varchar(191) NOT NULL,
  "date" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "messageCount" integer NOT NULL DEFAULT 0,
  "activeUsers" integer NOT NULL DEFAULT 0,
  "voiceMinutes" integer NOT NULL DEFAULT 0,
  "peakConcurrent" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServerStats_serverId_date_key" ON "ServerStats"("serverId","date");
CREATE INDEX "ServerStats_serverId_date_idx" ON "ServerStats"("serverId","date");
