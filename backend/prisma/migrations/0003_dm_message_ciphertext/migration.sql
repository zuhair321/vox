-- F3 (privacy): DmMessage now carries an end-to-end encrypted envelope.
-- Backward-compatible: existing rows keep `content` plaintext; new rows use
-- `ciphertext` with `content = NULL`. The server NEVER sees plaintext for
-- rows with ciphertext set.

-- 1. Make `content` nullable so E2E rows may have NULL there.
ALTER TABLE "DmMessage" ALTER COLUMN "content" DROP NOT NULL;

-- 2. Add the new envelope columns. keyVersion defaults to 1 so legacy rows
-- carry 1 (the server already mints versions sequentially on rotation).
ALTER TABLE "DmMessage"
  ADD COLUMN IF NOT EXISTS "ciphertext"           TEXT,
  ADD COLUMN IF NOT EXISTS "nonce"                TEXT,
  ADD COLUMN IF NOT EXISTS "keyVersion"           INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "senderKeyFingerprint" TEXT;

-- 3. Backfill any rows that pre-existed before default applied.
UPDATE "DmMessage" SET "keyVersion" = 1 WHERE "keyVersion" IS NULL;

-- 4. Cheap index for the receiver's "which key version?" lookup.
CREATE INDEX IF NOT EXISTS "DmMessage_dmId_keyVersion_idx"
  ON "DmMessage"("dmId", "keyVersion");
