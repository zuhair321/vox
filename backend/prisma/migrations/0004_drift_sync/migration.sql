-- 0004: sync drift from feature commits (bots, edit-history, push notifications,
-- notification levels, emoji animation). Brings DB up to current schema.prisma.

-- 1. Remove the now-unused User_publicKey index (replaced by inline @index in schema).
DROP INDEX IF EXISTS "User_publicKey_idx";

-- 2. Bot columns on User.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isBot"            BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "botTokenHash"     TEXT,
  ADD COLUMN IF NOT EXISTS "botPrefix"        TEXT,
  ADD COLUMN IF NOT EXISTS "botDescription"   TEXT,
  ADD COLUMN IF NOT EXISTS "botPublicKey"     TEXT,
  ADD COLUMN IF NOT EXISTS "botCreatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. Edit-history for messages (audit trail for inline edits).
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "editHistory"      JSONB;

-- 4. Per-channel notification level.
ALTER TABLE "NotificationSettings"
  ADD COLUMN IF NOT EXISTS "level"            TEXT          NOT NULL DEFAULT 'DEFAULT';

-- 5. Animated custom emoji metadata.
ALTER TABLE "CustomEmoji"
  ADD COLUMN IF NOT EXISTS "animated"         BOOLEAN       NOT NULL DEFAULT false;

-- 6. AppConfig singleton for VAPID push-notification keys.
CREATE TABLE IF NOT EXISTS "AppConfig" (
  "id"          TEXT        NOT NULL DEFAULT 'singleton',
  "vapidPublic" TEXT,
  "vapidPrivate"TEXT,
  "vapidSubject"TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
