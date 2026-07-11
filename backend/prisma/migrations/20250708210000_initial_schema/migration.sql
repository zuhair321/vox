-- Migration: 20250708210000_initial_schema
-- VOX backend — full schema baseline
-- Run with: npx prisma migrate deploy
-- This migration creates all 28 tables. Tables already exist in the DB
-- (created via prisma db push); this file is the source-of-truth for the schema.

-- ── _prisma_migrations (Prisma internal) ──────────────────────────
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── User ──────────────────────────────────────────────────────────
CREATE TABLE `User` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEMBER',
  `color` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#5865f2',
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OFFLINE',
  `activity` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `twoFactorSecret` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `twoFactorEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `avatarUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bannerUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emailVerified` tinyint(1) NOT NULL DEFAULT 0,
  `loginAttempts` int NOT NULL DEFAULT 0,
  `lockedUntil` datetime(3) DEFAULT NULL,
  `lastLoginAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  UNIQUE KEY `User_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Server ────────────────────────────────────────────────────────
CREATE TABLE `Server` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banner` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COMMUNITY',
  `isPublic` tinyint(1) NOT NULL DEFAULT 0,
  `verificationLevel` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE',
  `vanityUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defaultChannelId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ownerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Server_ownerId_fkey` (`ownerId`),
  CONSTRAINT `Server_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Channel ───────────────────────────────────────────────────────
CREATE TABLE `Channel` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TEXT',
  `position` int NOT NULL DEFAULT 0,
  `nsfw` tinyint(1) NOT NULL DEFAULT 0,
  `slowmode` int NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Channel_serverId_fkey` (`serverId`),
  KEY `Channel_categoryId_fkey` (`categoryId`),
  CONSTRAINT `Channel_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Channel_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Message ───────────────────────────────────────────────────────
CREATE TABLE `Message` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channelId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authorOverride` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `attachments` json DEFAULT NULL,
  `deleted` tinyint(1) NOT NULL DEFAULT 0,
  `edited` tinyint(1) NOT NULL DEFAULT 0,
  `parentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pinned` tinyint(1) NOT NULL DEFAULT 0,
  `fuseTime` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Message_channelId_createdAt_idx` (`channelId`,`createdAt`),
  KEY `Message_userId_idx` (`userId`),
  KEY `Message_parentId_idx` (`parentId`),
  FULLTEXT KEY `Message_body_idx` (`body`),
  CONSTRAINT `Message_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Message_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Message`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Message_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── DmMessage ─────────────────────────────────────────────────────
CREATE TABLE `DmMessage` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachments` json DEFAULT NULL,
  `dmId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipientId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited` tinyint(1) NOT NULL DEFAULT 0,
  `deleted` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `DmMessage_dmId_createdAt_idx` (`dmId`,`createdAt`),
  KEY `DmMessage_recipientId_read_idx` (`recipientId`,`read`),
  KEY `DmMessage_senderId_createdAt_idx` (`senderId`,`createdAt`),
  CONSTRAINT `DmMessage_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DmMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Friend ────────────────────────────────────────────────────────
CREATE TABLE `Friend` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `friendId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Friend_userId_friendId_key` (`userId`,`friendId`),
  KEY `Friend_userId_status_idx` (`userId`,`status`),
  KEY `Friend_friendId_status_idx` (`friendId`,`status`),
  CONSTRAINT `Friend_friendId_fkey` FOREIGN KEY (`friendId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Friend_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ServerMember ──────────────────────────────────────────────────
CREATE TABLE `ServerMember` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEMBER',
  `nick` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `joinedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `mutedUntil` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ServerMember_serverId_userId_key` (`serverId`,`userId`),
  KEY `ServerMember_userId_idx` (`userId`),
  CONSTRAINT `ServerMember_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ServerMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Invite ────────────────────────────────────────────────────────
CREATE TABLE `Invite` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creatorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `maxUses` int NOT NULL DEFAULT 0,
  `uses` int NOT NULL DEFAULT 0,
  `expiresAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Invite_code_key` (`code`),
  KEY `Invite_serverId_fkey` (`serverId`),
  KEY `Invite_creatorId_fkey` (`creatorId`),
  CONSTRAINT `Invite_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Invite_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ServerBan ──────────────────────────────────────────────────────
CREATE TABLE `ServerBan` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ServerBan_serverId_userId_key` (`serverId`,`userId`),
  KEY `ServerBan_userId_fkey` (`userId`),
  CONSTRAINT `ServerBan_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ServerBan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── AuditLog ──────────────────────────────────────────────────────
CREATE TABLE `AuditLog` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AuditLog_serverId_createdAt_idx` (`serverId`,`createdAt`),
  KEY `AuditLog_userId_fkey` (`userId`),
  CONSTRAINT `AuditLog_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Category ──────────────────────────────────────────────────────
CREATE TABLE `Category` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL DEFAULT 0,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Category_serverId_fkey` (`serverId`),
  CONSTRAINT `Category_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Permission ────────────────────────────────────────────────────
CREATE TABLE `Permission` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channelId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `canRead` tinyint(1) NOT NULL DEFAULT 1,
  `canWrite` tinyint(1) NOT NULL DEFAULT 1,
  `canManage` tinyint(1) NOT NULL DEFAULT 0,
  `canAdmin` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Permission_channelId_role_key` (`channelId`,`role`),
  CONSTRAINT `Permission_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Reaction ───────────────────────────────────────────────────────
CREATE TABLE `Reaction` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `messageId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emoji` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Reaction_messageId_userId_emoji_key` (`messageId`,`userId`,`emoji`),
  KEY `Reaction_messageId_idx` (`messageId`),
  KEY `Reaction_userId_idx` (`userId`),
  CONSTRAINT `Reaction_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Reaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── RefreshToken ─────────────────────────────────────────────────
CREATE TABLE `RefreshToken` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT 0,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deviceInfo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ipAddress` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `RefreshToken_tokenHash_key` (`tokenHash`),
  KEY `RefreshToken_userId_fkey` (`userId`),
  CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── PasswordReset ─────────────────────────────────────────────────
CREATE TABLE `PasswordReset` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PasswordReset_tokenHash_key` (`tokenHash`),
  KEY `PasswordReset_userId_fkey` (`userId`),
  CONSTRAINT `PasswordReset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Block ─────────────────────────────────────────────────────────
CREATE TABLE `Block` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blockedId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Block_userId_blockedId_key` (`userId`,`blockedId`),
  KEY `Block_blockedId_fkey` (`blockedId`),
  CONSTRAINT `Block_blockedId_fkey` FOREIGN KEY (`blockedId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Block_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Webhook ───────────────────────────────────────────────────────
CREATE TABLE `Webhook` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channelId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatarUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Webhook_token_key` (`token`),
  KEY `Webhook_serverId_fkey` (`serverId`),
  KEY `Webhook_channelId_fkey` (`channelId`),
  CONSTRAINT `Webhook_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Webhook_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── CustomEmoji ───────────────────────────────────────────────────
CREATE TABLE `CustomEmoji` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `CustomEmoji_serverId_name_key` (`serverId`,`name`),
  CONSTRAINT `CustomEmoji_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Report ────────────────────────────────────────────────────────
CREATE TABLE `Report` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporterId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reportedUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `messageId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Report_reporterId_fkey` (`reporterId`),
  KEY `Report_reportedUserId_fkey` (`reportedUserId`),
  CONSTRAINT `Report_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ServerRole ───────────────────────────────────────────────────
CREATE TABLE `ServerRole` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#5865f2',
  `hoist` tinyint(1) NOT NULL DEFAULT 0,
  `mentionable` tinyint(1) NOT NULL DEFAULT 0,
  `position` int NOT NULL DEFAULT 0,
  `permissions` bigint NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ServerRole_serverId_name_key` (`serverId`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ServerMemberRole ─────────────────────────────────────────────
CREATE TABLE `ServerMemberRole` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverMemberId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── MessageRead ───────────────────────────────────────────────────
CREATE TABLE `MessageRead` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `messageId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `readAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `MessageRead_messageId_userId_key` (`messageId`,`userId`),
  KEY `MessageRead_messageId_idx` (`messageId`),
  KEY `MessageRead_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── UserNote ──────────────────────────────────────────────────────
CREATE TABLE `UserNote` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserNote_userId_targetId_key` (`userId`,`targetId`),
  KEY `UserNote_targetId_fkey` (`targetId`),
  CONSTRAINT `UserNote_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserNote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ScheduledMessage ──────────────────────────────────────────────
CREATE TABLE `ScheduledMessage` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channelId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachments` json DEFAULT NULL,
  `scheduledAt` datetime(3) NOT NULL,
  `sent` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ScheduledMessage_scheduledAt_sent_idx` (`scheduledAt`,`sent`),
  KEY `ScheduledMessage_channelId_fkey` (`channelId`),
  KEY `ScheduledMessage_userId_fkey` (`userId`),
  CONSTRAINT `ScheduledMessage_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ScheduledMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ServerTemplate ────────────────────────────────────────────────
CREATE TABLE `ServerTemplate` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ownerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json NOT NULL,
  `uses` int NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ServerTemplate_ownerId_idx` (`ownerId`),
  KEY `ServerTemplate_serverId_fkey` (`serverId`),
  CONSTRAINT `ServerTemplate_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ServerTemplate_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ApiKey ─────────────────────────────────────────────────────────
CREATE TABLE `ApiKey` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keyHash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keyPrefix` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scopes` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '*',
  `lastUsed` datetime(3) DEFAULT NULL,
  `expiresAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ApiKey_keyHash_key` (`keyHash`),
  KEY `ApiKey_userId_idx` (`userId`),
  CONSTRAINT `ApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── PinNotification ────────────────────────────────────────────────
CREATE TABLE `PinNotification` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channelId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `messageId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pinnedBy` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `PinNotification_userId_read_idx` (`userId`,`read`),
  KEY `PinNotification_channelId_fkey` (`channelId`),
  KEY `PinNotification_messageId_fkey` (`messageId`),
  KEY `PinNotification_pinnedBy_fkey` (`pinnedBy`),
  CONSTRAINT `PinNotification_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PinNotification_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PinNotification_pinnedBy_fkey` FOREIGN KEY (`pinnedBy`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PinNotification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ChannelArchiveConfig ───────────────────────────────────────────
CREATE TABLE `ChannelArchiveConfig` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channelId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `daysToKeep` int NOT NULL DEFAULT 90,
  `lastArchivedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ChannelArchiveConfig_channelId_key` (`channelId`),
  CONSTRAINT `ChannelArchiveConfig_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ServerStats ───────────────────────────────────────────────────
CREATE TABLE `ServerStats` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serverId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `messageCount` int NOT NULL DEFAULT 0,
  `activeUsers` int NOT NULL DEFAULT 0,
  `voiceMinutes` int NOT NULL DEFAULT 0,
  `peakConcurrent` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ServerStats_serverId_date_key` (`serverId`,`date`),
  KEY `ServerStats_serverId_date_idx` (`serverId`,`date`),
  CONSTRAINT `ServerStats_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
