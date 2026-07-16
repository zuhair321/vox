-- VOX — Partition Message by channelId (hash, 16 partitions)
-- Roadmap (ARCHITECTURE_100K_ROADMAP.md, Month 1, highest-leverage item).
--
-- WHY: at 100k MAU a single `Message` table becomes a write bottleneck.
-- Partitioning by channelId spreads writes/reads across 16 physical chunks
-- and keeps each (channelId, createdAt) index small. This buys ~5-10x write
-- headroom on a single Postgres primary.
--
-- SAFETY: This is a maintenance-window migration. Run with zero traffic
-- (stop the backend first). It renames the live table to Message_old, builds
-- the partitioned table, copies rows, and swaps names. The PK changes from
-- `id` to `(id, channelId)` — Prisma's generated client still works because
-- the parent table is still named "Message"; just keep `channelId` in every
-- unique/index. After running, update prisma/schema.prisma's Message model to
-- `@@id([id, channelId])` and re-run `prisma generate`.

BEGIN;

-- 1. Get the current DDL as a backup reference (inspect before proceeding).
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'Message' ORDER BY ordinal_position;

-- 2. Rename the live table out of the way.
ALTER TABLE "Message" RENAME TO "Message_old";

-- 3. Partitioned parent. PK MUST include the partition key (channelId).
CREATE TABLE "Message" (
  id             TEXT    NOT NULL,
  channelId      TEXT    NOT NULL,
  userId         TEXT,
  authorOverride TEXT,
  body           TEXT    NOT NULL,
  createdAt      TIMESTAMPTZ NOT NULL DEFAULT now(),
  attachments    JSONB,
  deleted        BOOLEAN NOT NULL DEFAULT false,
  edited         BOOLEAN NOT NULL DEFAULT false,
  parentId       TEXT,
  pinned         BOOLEAN NOT NULL DEFAULT false,
  isForumPost    BOOLEAN NOT NULL DEFAULT false,
  tags           JSONB,
  fuseTime       TIMESTAMPTZ,
  CONSTRAINT "Message_pkey" PRIMARY KEY (id, channelId)
) PARTITION BY HASH (channelId);

-- 4. 16 hash partitions.
CREATE TABLE "Message_p0"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE "Message_p1"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 1);
CREATE TABLE "Message_p2"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 2);
CREATE TABLE "Message_p3"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 3);
CREATE TABLE "Message_p4"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 4);
CREATE TABLE "Message_p5"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 5);
CREATE TABLE "Message_p6"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 6);
CREATE TABLE "Message_p7"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 7);
CREATE TABLE "Message_p8"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 8);
CREATE TABLE "Message_p9"  PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 9);
CREATE TABLE "Message_p10" PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 10);
CREATE TABLE "Message_p11" PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 11);
CREATE TABLE "Message_p12" PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 12);
CREATE TABLE "Message_p13" PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 13);
CREATE TABLE "Message_p14" PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 14);
CREATE TABLE "Message_p15" PARTITION OF "Message" FOR VALUES WITH (MODULUS 16, REMAINDER 15);

-- 5. Foreign keys + indexes (mirror the old table).
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "Message_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id");

CREATE INDEX "Message_channelId_createdAt_idx" ON "Message" ("channelId", "createdAt");
CREATE INDEX "Message_userId_idx"             ON "Message" ("userId");
CREATE INDEX "Message_parentId_idx"           ON "Message" ("parentId");

-- 6. Copy the data.
INSERT INTO "Message"
  (id, channelId, userId, authorOverride, body, createdAt, attachments,
   deleted, edited, parentId, pinned, isForumPost, tags, fuseTime)
SELECT
   id, channelId, userId, authorOverride, body, createdAt, attachments,
   deleted, edited, parentId, pinned, isForumPost, tags, fuseTime
FROM "Message_old";

-- 7. Recreate dependent FKs that pointed at the old Message (reactions, etc.).
ALTER TABLE "Reaction"
  ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE;
ALTER TABLE "PinNotification"
  ADD CONSTRAINT "PinNotification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE;
ALTER TABLE "MessageRead"
  ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE;

-- 8. Sanity: row counts must match before dropping the old table.
--    SELECT count(*) FROM "Message";      -- new
--    SELECT count(*) FROM "Message_old";  -- old (should match)

-- 9. Only after verifying counts + app smoke test:
--    DROP TABLE "Message_old";

COMMIT;
