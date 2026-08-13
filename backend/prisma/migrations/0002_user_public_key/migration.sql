-- AlterTable
ALTER TABLE "User" ADD COLUMN "publicKey" TEXT;
ALTER TABLE "User" ADD COLUMN "publicKeyFingerprint" TEXT;
ALTER TABLE "User" ADD COLUMN "keyRotatedAt" TIMESTAMP(3);
CREATE INDEX "User_publicKey_idx" ON "User"("publicKey");
