/*
  Warnings:

  - You are about to alter the column `createdAt` on the `ApiKey` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `expiresAt` on the `ApiKey` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `lastUsed` on the `ApiKey` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `AuditLog` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Block` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Channel` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `Channel` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `ChannelArchiveConfig` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `lastArchivedAt` on the `ChannelArchiveConfig` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `ChannelArchiveConfig` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `CustomEmoji` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `DmMessage` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Friend` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Invite` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `expiresAt` on the `Invite` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `fuseTime` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `readAt` on the `MessageRead` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `PasswordReset` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `PinNotification` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Reaction` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `RefreshToken` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `expiresAt` on the `RefreshToken` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Report` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `ScheduledMessage` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `scheduledAt` on the `ScheduledMessage` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Server` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `Server` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `ServerBan` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `expiresAt` on the `ServerBan` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `joinedAt` on the `ServerMember` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `mutedUntil` on the `ServerMember` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `ServerMemberRole` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `ServerRole` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `ServerRole` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `date` on the `ServerStats` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `ServerTemplate` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `lastLoginAt` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `lockedUntil` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `turboSince` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `UserNote` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `UserNote` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `createdAt` on the `Webhook` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.
  - You are about to alter the column `updatedAt` on the `Webhook` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.

*/
-- CreateTable
CREATE TABLE "AutomodConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "filterWords" BOOLEAN NOT NULL DEFAULT true,
    "filterLinks" BOOLEAN NOT NULL DEFAULT true,
    "filterSpam" BOOLEAN NOT NULL DEFAULT true,
    "maxStrikes" INTEGER NOT NULL DEFAULT 3,
    "strikeTimeout" INTEGER NOT NULL DEFAULT 1440,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomodConfig_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Strike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Strike_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServerWidget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "showOnline" BOOLEAN NOT NULL DEFAULT true,
    "showJoin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServerWidget_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "maxVotes" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "Poll_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Poll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "color" TEXT DEFAULT '#5865f2',
    "serverId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sticker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "serverId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PNG',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sticker_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "serverId" TEXT,
    "volume" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sound_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StageSpeaker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageSpeaker_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channelId" TEXT,
    "message" TEXT NOT NULL,
    "remindAt" DATETIME NOT NULL,
    "recurring" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnnouncementFollow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "followerServerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementFollow_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serverId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serverId" TEXT,
    "channelId" TEXT,
    "muted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "userAgent" TEXT,
    "page" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '*',
    "lastUsed" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ApiKey" ("createdAt", "expiresAt", "id", "keyHash", "keyPrefix", "lastUsed", "name", "scopes", "userId") SELECT "createdAt", "expiresAt", "id", "keyHash", "keyPrefix", "lastUsed", "name", "scopes", "userId" FROM "ApiKey";
DROP TABLE "ApiKey";
ALTER TABLE "new_ApiKey" RENAME TO "ApiKey";
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "details", "id", "serverId", "targetId", "userId") SELECT "action", "createdAt", "details", "id", "serverId", "targetId", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_serverId_createdAt_idx" ON "AuditLog"("serverId", "createdAt");
CREATE TABLE "new_Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Block_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Block" ("blockedId", "createdAt", "id", "reason", "userId") SELECT "blockedId", "createdAt", "id", "reason", "userId" FROM "Block";
DROP TABLE "Block";
ALTER TABLE "new_Block" RENAME TO "Block";
CREATE UNIQUE INDEX "Block_userId_blockedId_key" ON "Block"("userId", "blockedId");
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "serverId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("createdAt", "id", "name", "position", "serverId") SELECT "createdAt", "id", "name", "position", "serverId" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE TABLE "new_Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "position" INTEGER NOT NULL DEFAULT 0,
    "nsfw" BOOLEAN NOT NULL DEFAULT false,
    "slowmode" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT NOT NULL DEFAULT 'auto',
    "rtcMode" TEXT NOT NULL DEFAULT 'MESH',
    "maxParticipants" INTEGER NOT NULL DEFAULT 0,
    "stageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT,
    "serverId" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Channel_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Channel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Channel" ("categoryId", "createdAt", "id", "name", "nsfw", "position", "serverId", "slowmode", "topic", "type", "updatedAt") SELECT "categoryId", "createdAt", "id", "name", "nsfw", "position", "serverId", "slowmode", "topic", "type", "updatedAt" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE TABLE "new_ChannelArchiveConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "daysToKeep" INTEGER NOT NULL DEFAULT 90,
    "lastArchivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChannelArchiveConfig_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChannelArchiveConfig" ("channelId", "createdAt", "daysToKeep", "enabled", "id", "lastArchivedAt", "updatedAt") SELECT "channelId", "createdAt", "daysToKeep", "enabled", "id", "lastArchivedAt", "updatedAt" FROM "ChannelArchiveConfig";
DROP TABLE "ChannelArchiveConfig";
ALTER TABLE "new_ChannelArchiveConfig" RENAME TO "ChannelArchiveConfig";
CREATE UNIQUE INDEX "ChannelArchiveConfig_channelId_key" ON "ChannelArchiveConfig"("channelId");
CREATE TABLE "new_CustomEmoji" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomEmoji_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomEmoji" ("createdAt", "id", "name", "serverId", "url") SELECT "createdAt", "id", "name", "serverId", "url" FROM "CustomEmoji";
DROP TABLE "CustomEmoji";
ALTER TABLE "new_CustomEmoji" RENAME TO "CustomEmoji";
CREATE UNIQUE INDEX "CustomEmoji_serverId_name_key" ON "CustomEmoji"("serverId", "name");
CREATE TABLE "new_DmMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "dmId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DmMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DmMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DmMessage" ("attachments", "content", "createdAt", "deleted", "dmId", "edited", "id", "read", "recipientId", "senderId") SELECT "attachments", "content", "createdAt", "deleted", "dmId", "edited", "id", "read", "recipientId", "senderId" FROM "DmMessage";
DROP TABLE "DmMessage";
ALTER TABLE "new_DmMessage" RENAME TO "DmMessage";
CREATE INDEX "DmMessage_dmId_createdAt_idx" ON "DmMessage"("dmId", "createdAt");
CREATE INDEX "DmMessage_recipientId_read_idx" ON "DmMessage"("recipientId", "read");
CREATE INDEX "DmMessage_senderId_createdAt_idx" ON "DmMessage"("senderId", "createdAt");
CREATE TABLE "new_Friend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Friend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Friend" ("createdAt", "friendId", "id", "status", "userId") SELECT "createdAt", "friendId", "id", "status", "userId" FROM "Friend";
DROP TABLE "Friend";
ALTER TABLE "new_Friend" RENAME TO "Friend";
CREATE INDEX "Friend_userId_status_idx" ON "Friend"("userId", "status");
CREATE INDEX "Friend_friendId_status_idx" ON "Friend"("friendId", "status");
CREATE UNIQUE INDEX "Friend_userId_friendId_key" ON "Friend"("userId", "friendId");
CREATE TABLE "new_Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invite_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Invite" ("code", "createdAt", "creatorId", "expiresAt", "id", "maxUses", "serverId", "uses") SELECT "code", "createdAt", "creatorId", "expiresAt", "id", "maxUses", "serverId", "uses" FROM "Invite";
DROP TABLE "Invite";
ALTER TABLE "new_Invite" RENAME TO "Invite";
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "userId" TEXT,
    "authorOverride" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachments" JSONB,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "isForumPost" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "fuseTime" DATETIME,
    CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("attachments", "authorOverride", "body", "channelId", "createdAt", "deleted", "edited", "fuseTime", "id", "parentId", "pinned", "userId") SELECT "attachments", "authorOverride", "body", "channelId", "createdAt", "deleted", "edited", "fuseTime", "id", "parentId", "pinned", "userId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
CREATE INDEX "Message_parentId_idx" ON "Message"("parentId");
CREATE TABLE "new_MessageRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_MessageRead" ("id", "messageId", "readAt", "userId") SELECT "id", "messageId", "readAt", "userId" FROM "MessageRead";
DROP TABLE "MessageRead";
ALTER TABLE "new_MessageRead" RENAME TO "MessageRead";
CREATE INDEX "MessageRead_messageId_idx" ON "MessageRead"("messageId");
CREATE INDEX "MessageRead_userId_idx" ON "MessageRead"("userId");
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");
CREATE TABLE "new_PasswordReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RESET',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PasswordReset" ("createdAt", "id", "tokenHash", "userId") SELECT "createdAt", "id", "tokenHash", "userId" FROM "PasswordReset";
DROP TABLE "PasswordReset";
ALTER TABLE "new_PasswordReset" RENAME TO "PasswordReset";
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE TABLE "new_Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT true,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "canAdmin" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Permission_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Permission" ("canAdmin", "canManage", "canRead", "canWrite", "channelId", "id", "role") SELECT "canAdmin", "canManage", "canRead", "canWrite", "channelId", "id", "role" FROM "Permission";
DROP TABLE "Permission";
ALTER TABLE "new_Permission" RENAME TO "Permission";
CREATE UNIQUE INDEX "Permission_channelId_role_key" ON "Permission"("channelId", "role");
CREATE TABLE "new_PinNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedBy" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PinNotification_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PinNotification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PinNotification_pinnedBy_fkey" FOREIGN KEY ("pinnedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PinNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PinNotification" ("channelId", "createdAt", "id", "messageId", "pinnedBy", "read", "userId") SELECT "channelId", "createdAt", "id", "messageId", "pinnedBy", "read", "userId" FROM "PinNotification";
DROP TABLE "PinNotification";
ALTER TABLE "new_PinNotification" RENAME TO "PinNotification";
CREATE INDEX "PinNotification_userId_read_idx" ON "PinNotification"("userId", "read");
CREATE TABLE "new_Reaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Reaction" ("createdAt", "emoji", "id", "messageId", "userId") SELECT "createdAt", "emoji", "id", "messageId", "userId" FROM "Reaction";
DROP TABLE "Reaction";
ALTER TABLE "new_Reaction" RENAME TO "Reaction";
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");
CREATE INDEX "Reaction_userId_idx" ON "Reaction"("userId");
CREATE UNIQUE INDEX "Reaction_messageId_userId_emoji_key" ON "Reaction"("messageId", "userId", "emoji");
CREATE TABLE "new_RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RefreshToken" ("createdAt", "deviceInfo", "expiresAt", "id", "ipAddress", "revoked", "tokenHash", "userAgent", "userId") SELECT "createdAt", "deviceInfo", "expiresAt", "id", "ipAddress", "revoked", "tokenHash", "userAgent", "userId" FROM "RefreshToken";
DROP TABLE "RefreshToken";
ALTER TABLE "new_RefreshToken" RENAME TO "RefreshToken";
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "messageId" TEXT,
    "serverId" TEXT,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("createdAt", "details", "id", "messageId", "reason", "reportedUserId", "reporterId", "serverId", "status", "type") SELECT "createdAt", "details", "id", "messageId", "reason", "reportedUserId", "reporterId", "serverId", "status", "type" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE TABLE "new_ScheduledMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "scheduledAt" DATETIME NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduledMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledMessage" ("attachments", "body", "channelId", "createdAt", "id", "scheduledAt", "sent", "userId") SELECT "attachments", "body", "channelId", "createdAt", "id", "scheduledAt", "sent", "userId" FROM "ScheduledMessage";
DROP TABLE "ScheduledMessage";
ALTER TABLE "new_ScheduledMessage" RENAME TO "ScheduledMessage";
CREATE INDEX "ScheduledMessage_scheduledAt_sent_idx" ON "ScheduledMessage"("scheduledAt", "sent");
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "banner" TEXT,
    "category" TEXT NOT NULL DEFAULT 'COMMUNITY',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "verificationLevel" TEXT NOT NULL DEFAULT 'NONE',
    "vanityUrl" TEXT,
    "defaultChannelId" TEXT,
    "require2FA" BOOLEAN NOT NULL DEFAULT false,
    "region" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER NOT NULL DEFAULT 0,
    "boosts" INTEGER NOT NULL DEFAULT 0,
    "boosters" JSONB,
    "rulesScreening" BOOLEAN NOT NULL DEFAULT false,
    "welcomeMessage" TEXT,
    "welcomeChannels" JSONB,
    "subcategory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Server_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Server" ("banner", "category", "createdAt", "defaultChannelId", "description", "icon", "id", "isPublic", "name", "ownerId", "updatedAt", "vanityUrl", "verificationLevel") SELECT "banner", "category", "createdAt", "defaultChannelId", "description", "icon", "id", "isPublic", "name", "ownerId", "updatedAt", "vanityUrl", "verificationLevel" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE TABLE "new_ServerBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "ServerBan_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServerBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ServerBan" ("createdAt", "expiresAt", "id", "reason", "serverId", "userId") SELECT "createdAt", "expiresAt", "id", "reason", "serverId", "userId" FROM "ServerBan";
DROP TABLE "ServerBan";
ALTER TABLE "new_ServerBan" RENAME TO "ServerBan";
CREATE UNIQUE INDEX "ServerBan_serverId_userId_key" ON "ServerBan"("serverId", "userId");
CREATE TABLE "new_ServerMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "nick" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mutedUntil" DATETIME,
    CONSTRAINT "ServerMember_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServerMember" ("id", "joinedAt", "mutedUntil", "nick", "role", "serverId", "userId") SELECT "id", "joinedAt", "mutedUntil", "nick", "role", "serverId", "userId" FROM "ServerMember";
DROP TABLE "ServerMember";
ALTER TABLE "new_ServerMember" RENAME TO "ServerMember";
CREATE INDEX "ServerMember_userId_idx" ON "ServerMember"("userId");
CREATE UNIQUE INDEX "ServerMember_serverId_userId_key" ON "ServerMember"("serverId", "userId");
CREATE TABLE "new_ServerMemberRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverMemberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ServerMemberRole" ("createdAt", "id", "roleId", "serverMemberId") SELECT "createdAt", "id", "roleId", "serverMemberId" FROM "ServerMemberRole";
DROP TABLE "ServerMemberRole";
ALTER TABLE "new_ServerMemberRole" RENAME TO "ServerMemberRole";
CREATE TABLE "new_ServerRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#5865f2',
    "hoist" BOOLEAN NOT NULL DEFAULT false,
    "mentionable" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "permissions" TEXT NOT NULL DEFAULT '0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ServerRole" ("color", "createdAt", "hoist", "id", "mentionable", "name", "permissions", "position", "serverId", "updatedAt") SELECT "color", "createdAt", "hoist", "id", "mentionable", "name", "permissions", "position", "serverId", "updatedAt" FROM "ServerRole";
DROP TABLE "ServerRole";
ALTER TABLE "new_ServerRole" RENAME TO "ServerRole";
CREATE UNIQUE INDEX "ServerRole_serverId_name_key" ON "ServerRole"("serverId", "name");
CREATE TABLE "new_ServerStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "peakConcurrent" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ServerStats_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServerStats" ("activeUsers", "date", "id", "messageCount", "peakConcurrent", "serverId", "voiceMinutes") SELECT "activeUsers", "date", "id", "messageCount", "peakConcurrent", "serverId", "voiceMinutes" FROM "ServerStats";
DROP TABLE "ServerStats";
ALTER TABLE "new_ServerStats" RENAME TO "ServerStats";
CREATE INDEX "ServerStats_serverId_date_idx" ON "ServerStats"("serverId", "date");
CREATE UNIQUE INDEX "ServerStats_serverId_date_key" ON "ServerStats"("serverId", "date");
CREATE TABLE "new_ServerTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerTemplate_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServerTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServerTemplate" ("createdAt", "data", "description", "id", "name", "ownerId", "serverId", "uses") SELECT "createdAt", "data", "description", "id", "name", "ownerId", "serverId", "uses" FROM "ServerTemplate";
DROP TABLE "ServerTemplate";
ALTER TABLE "new_ServerTemplate" RENAME TO "ServerTemplate";
CREATE INDEX "ServerTemplate_ownerId_idx" ON "ServerTemplate"("ownerId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "color" TEXT NOT NULL DEFAULT '#5865f2',
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "activity" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "bio" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "hasTurbo" BOOLEAN NOT NULL DEFAULT true,
    "turboSince" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "activityData" JSONB,
    "profileTheme" TEXT,
    "avatarFrame" TEXT,
    "animatedAvatar" BOOLEAN NOT NULL DEFAULT false,
    "voiceSettings" JSONB
);
INSERT INTO "new_User" ("activity", "avatarUrl", "bannerUrl", "bio", "color", "createdAt", "displayName", "email", "emailVerified", "hasTurbo", "id", "lastLoginAt", "lockedUntil", "loginAttempts", "passwordHash", "role", "status", "turboSince", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "username") SELECT "activity", "avatarUrl", "bannerUrl", "bio", "color", "createdAt", "displayName", "email", "emailVerified", "hasTurbo", "id", "lastLoginAt", "lockedUntil", "loginAttempts", "passwordHash", "role", "status", "turboSince", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE TABLE "new_UserNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserNote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserNote" ("content", "createdAt", "id", "targetId", "updatedAt", "userId") SELECT "content", "createdAt", "id", "targetId", "updatedAt", "userId" FROM "UserNote";
DROP TABLE "UserNote";
ALTER TABLE "new_UserNote" RENAME TO "UserNote";
CREATE UNIQUE INDEX "UserNote_userId_targetId_key" ON "UserNote"("userId", "targetId");
CREATE TABLE "new_Webhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "url" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Webhook_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Webhook_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Webhook" ("avatarUrl", "channelId", "createdAt", "id", "name", "serverId", "token", "updatedAt", "url") SELECT "avatarUrl", "channelId", "createdAt", "id", "name", "serverId", "token", "updatedAt", "url" FROM "Webhook";
DROP TABLE "Webhook";
ALTER TABLE "new_Webhook" RENAME TO "Webhook";
CREATE UNIQUE INDEX "Webhook_token_key" ON "Webhook"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AutomodConfig_serverId_key" ON "AutomodConfig"("serverId");

-- CreateIndex
CREATE INDEX "Strike_serverId_userId_idx" ON "Strike"("serverId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerWidget_serverId_key" ON "ServerWidget"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_optionId_userId_key" ON "PollVote"("optionId", "userId");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Sticker_serverId_name_key" ON "Sticker"("serverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Sound_serverId_name_key" ON "Sound"("serverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StageSpeaker_channelId_userId_key" ON "StageSpeaker"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Reminder_userId_remindAt_idx" ON "Reminder"("userId", "remindAt");

-- CreateIndex
CREATE INDEX "AnnouncementFollow_followerServerId_idx" ON "AnnouncementFollow"("followerServerId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementFollow_channelId_followerServerId_key" ON "AnnouncementFollow"("channelId", "followerServerId");

-- CreateIndex
CREATE INDEX "Integration_userId_idx" ON "Integration"("userId");

-- CreateIndex
CREATE INDEX "Integration_serverId_idx" ON "Integration"("serverId");

-- CreateIndex
CREATE INDEX "NotificationSettings_userId_idx" ON "NotificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_serverId_channelId_key" ON "NotificationSettings"("userId", "serverId", "channelId");

-- CreateIndex
CREATE INDEX "Feedback_category_idx" ON "Feedback"("category");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Feedback_rating_idx" ON "Feedback"("rating");
