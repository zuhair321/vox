-- Add missing tables for custom roles and account lockout
-- Run this once against PostgreSQL

-- 1. ServerRole table (custom server roles)
CREATE TABLE IF NOT EXISTS "ServerRole" (
  id VARCHAR(36) PRIMARY KEY,
  "serverId" VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#5865f2',
  hoist BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  permissions BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_serverrole_server ON "ServerRole" ("serverId");

-- 2. ServerMemberRole table (many-to-many between servermember and serverrole)
CREATE TABLE IF NOT EXISTS "ServerMemberRole" (
  id VARCHAR(36) PRIMARY KEY,
  "serverMemberId" VARCHAR(36) NOT NULL,
  "roleId" VARCHAR(36) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("serverMemberId", "roleId")
);

CREATE INDEX IF NOT EXISTS idx_smrole_member ON "ServerMemberRole" ("serverMemberId");
CREATE INDEX IF NOT EXISTS idx_smrole_role ON "ServerMemberRole" ("roleId");

-- 3. Add login attempt fields to User (account lockout)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "loginAttempts" INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP NULL;

-- 4. Add device info to RefreshToken
ALTER TABLE "RefreshToken"
  ADD COLUMN IF NOT EXISTS "deviceInfo" VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS "ipAddress" VARCHAR(45) NULL,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT NULL;

-- 5. Report table (user reports)
CREATE TABLE IF NOT EXISTS "Report" (
  id VARCHAR(36) PRIMARY KEY,
  "reporterId" VARCHAR(36) NULL,
  "reportedUserId" VARCHAR(36) NULL,
  "messageId" VARCHAR(36) NULL,
  "serverId" VARCHAR(36) NULL,
  type VARCHAR(20) NOT NULL,
  reason VARCHAR(50) NOT NULL,
  details TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_status ON "Report" (status);
CREATE INDEX IF NOT EXISTS idx_report_reporter ON "Report" ("reporterId");
CREATE INDEX IF NOT EXISTS idx_report_reported ON "Report" ("reportedUserId");

SELECT 'Schema extensions applied successfully' AS status;
