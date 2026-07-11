-- Add missing tables for custom roles and account lockout
-- Run this once against MySQL

-- 1. ServerRole table (custom server roles)
CREATE TABLE IF NOT EXISTS serverrole (
  id VARCHAR(36) PRIMARY KEY,
  serverId VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#5865f2',
  hoist BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  permissions BIGINT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_serverrole_server (serverId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. ServerMemberRole table (many-to-many between servermember and serverrole)
CREATE TABLE IF NOT EXISTS servermemberrole (
  id VARCHAR(36) PRIMARY KEY,
  serverMemberId VARCHAR(36) NOT NULL,
  roleId VARCHAR(36) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_member_role (serverMemberId, roleId),
  INDEX idx_smrole_member (serverMemberId),
  INDEX idx_smrole_role (roleId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add login attempt fields to User (account lockout)
ALTER TABLE user
  ADD COLUMN loginAttempts INT NOT NULL DEFAULT 0,
  ADD COLUMN lockedUntil DATETIME NULL,
  ADD COLUMN lastLoginAt DATETIME NULL;

-- 4. Add device info to RefreshToken
ALTER TABLE refreshtoken
  ADD COLUMN deviceInfo VARCHAR(255) NULL,
  ADD COLUMN ipAddress VARCHAR(45) NULL,
  ADD COLUMN userAgent TEXT NULL;

-- 5. Report table (user reports)
CREATE TABLE IF NOT EXISTS report (
  id VARCHAR(36) PRIMARY KEY,
  reporterId VARCHAR(36) NOT NULL,
  reportedUserId VARCHAR(36) NULL,
  messageId VARCHAR(36) NULL,
  serverId VARCHAR(36) NULL,
  type ENUM('user','message','server') NOT NULL,
  reason ENUM('spam','harassment','inappropriate','unsafe','other') NOT NULL,
  details TEXT NULL,
  status ENUM('pending','reviewed','resolved','dismissed') NOT NULL DEFAULT 'pending',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_status (status),
  INDEX idx_report_reporter (reporterId),
  INDEX idx_report_reported (reportedUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'Schema extensions applied successfully' AS status;
