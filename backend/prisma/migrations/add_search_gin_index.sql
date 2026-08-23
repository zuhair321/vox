-- ═══════════════════════════════════════════════════════════════════
-- VOX Search — GIN Index + Auto-populate Trigger + Backfill
-- Run: psql -h 127.0.0.1 -p 5433 -U vox -d vox_dev -f migration.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. GIN index on searchVector for fast full-text lookups
CREATE INDEX IF NOT EXISTS "Message_searchVector_idx"
  ON "Message" USING GIN ("searchVector");

-- 2. Trigger function: auto-populate searchVector on INSERT and UPDATE of body
CREATE OR REPLACE FUNCTION update_message_searchvector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.body, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop old trigger if it exists, then create new one
DROP TRIGGER IF EXISTS trg_message_searchvector ON "Message";
CREATE TRIGGER trg_message_searchvector
  BEFORE INSERT OR UPDATE OF body
  ON "Message"
  FOR EACH ROW
  EXECUTE FUNCTION update_message_searchvector();

-- 4. Backfill existing messages (populate searchVector for rows with NULL)
UPDATE "Message"
SET "searchVector" = to_tsvector('english', COALESCE(body, ''))
WHERE "searchVector" IS NULL;
