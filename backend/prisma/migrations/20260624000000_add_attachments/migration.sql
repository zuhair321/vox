-- AlterTable: store chat attachments (images / videos / files) as JSON.
-- Nullable so existing messages keep working.
ALTER TABLE `Message` ADD COLUMN `attachments` JSON NULL;

-- AlterTable: same for direct messages.
ALTER TABLE `DMMessage` ADD COLUMN `attachments` JSON NULL;
