/*
  Warnings:

  - You are about to drop the `Poll` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PollOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PollVote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScheduledMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sticker` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `fuseTime` on the `Message` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PollVote_optionId_userId_key";

-- DropIndex
DROP INDEX "ScheduledMessage_scheduledAt_sent_idx";

-- DropIndex
DROP INDEX "Sticker_serverId_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Poll";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PollOption";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PollVote";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ScheduledMessage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sticker";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ChannelPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "roleId" TEXT,
    "userId" TEXT,
    "allow" BIGINT NOT NULL DEFAULT 0,
    "deny" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "ChannelPermission_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'user',
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT,
    "duration" INTEGER,
    "evidence" JSONB,
    "appealed" BOOLEAN NOT NULL DEFAULT false,
    "appealReason" TEXT,
    "appealStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutoModRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB NOT NULL,
    "exemptRoles" JSONB NOT NULL,
    "exemptChannels" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutoModAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AutoModAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoModRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moderationLogId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "stage" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appeal_moderationLogId_fkey" FOREIGN KEY ("moderationLogId") REFERENCES "ModerationLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appeal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppealMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appealId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppealMessage_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "Appeal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppealMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomPower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "grants" JSONB NOT NULL,
    "grantableBy" JSONB NOT NULL,
    "maxHolders" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ModerationWebhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("attachments", "authorOverride", "body", "channelId", "createdAt", "deleted", "edited", "id", "isForumPost", "parentId", "pinned", "tags", "userId") SELECT "attachments", "authorOverride", "body", "channelId", "createdAt", "deleted", "edited", "id", "isForumPost", "parentId", "pinned", "tags", "userId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
CREATE INDEX "Message_parentId_idx" ON "Message"("parentId");
CREATE INDEX "Message_channelId_deleted_createdAt_idx" ON "Message"("channelId", "deleted", "createdAt");
CREATE TABLE "new_ServerMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "nick" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mutedUntil" DATETIME,
    "deafened" BOOLEAN NOT NULL DEFAULT false,
    "timeoutUntil" DATETIME,
    "customPowers" JSONB,
    CONSTRAINT "ServerMember_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServerMember" ("id", "joinedAt", "mutedUntil", "nick", "role", "serverId", "userId") SELECT "id", "joinedAt", "mutedUntil", "nick", "role", "serverId", "userId" FROM "ServerMember";
DROP TABLE "ServerMember";
ALTER TABLE "new_ServerMember" RENAME TO "ServerMember";
CREATE INDEX "ServerMember_userId_idx" ON "ServerMember"("userId");
CREATE UNIQUE INDEX "ServerMember_serverId_userId_key" ON "ServerMember"("serverId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ChannelPermission_channelId_roleId_key" ON "ChannelPermission"("channelId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelPermission_channelId_userId_key" ON "ChannelPermission"("channelId", "userId");

-- CreateIndex
CREATE INDEX "ModerationLog_serverId_targetId_idx" ON "ModerationLog"("serverId", "targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_serverId_createdAt_idx" ON "ModerationLog"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "Badge_serverId_idx" ON "Badge"("serverId");

-- CreateIndex
CREATE INDEX "Channel_serverId_idx" ON "Channel"("serverId");

-- CreateIndex
CREATE INDEX "Channel_categoryId_idx" ON "Channel"("categoryId");

-- CreateIndex
CREATE INDEX "Channel_serverId_createdAt_idx" ON "Channel"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomEmoji_serverId_idx" ON "CustomEmoji"("serverId");

-- CreateIndex
CREATE INDEX "Invite_serverId_idx" ON "Invite"("serverId");

-- CreateIndex
CREATE INDEX "Invite_creatorId_idx" ON "Invite"("creatorId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- CreateIndex
CREATE INDEX "Report_serverId_idx" ON "Report"("serverId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_messageId_idx" ON "Report"("messageId");

-- CreateIndex
CREATE INDEX "Server_ownerId_idx" ON "Server"("ownerId");

-- CreateIndex
CREATE INDEX "ServerBan_serverId_idx" ON "ServerBan"("serverId");

-- CreateIndex
CREATE INDEX "ServerMemberRole_serverMemberId_idx" ON "ServerMemberRole"("serverMemberId");

-- CreateIndex
CREATE INDEX "ServerMemberRole_roleId_idx" ON "ServerMemberRole"("roleId");

-- CreateIndex
CREATE INDEX "ServerRole_serverId_idx" ON "ServerRole"("serverId");

-- CreateIndex
CREATE INDEX "Sound_serverId_idx" ON "Sound"("serverId");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE INDEX "Webhook_serverId_idx" ON "Webhook"("serverId");

-- CreateIndex
CREATE INDEX "Webhook_channelId_idx" ON "Webhook"("channelId");
