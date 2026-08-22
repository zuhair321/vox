-- CreateTable
CREATE TABLE "GroupDm" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "icon" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupDm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupDmMember" (
    "id" TEXT NOT NULL,
    "groupDmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "GroupDmMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupDmMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT,
    "ciphertext" TEXT,
    "nonce" TEXT,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "senderKeyFingerprint" TEXT,
    "attachments" JSONB,
    "groupDmId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GroupDmMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sticker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'png',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "serverId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "packId" TEXT,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StickerPack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerPack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupDm_ownerId_idx" ON "GroupDm"("ownerId");

-- CreateIndex
CREATE INDEX "GroupDmMember_groupDmId_idx" ON "GroupDmMember"("groupDmId");

-- CreateIndex
CREATE INDEX "GroupDmMember_userId_idx" ON "GroupDmMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupDmMember_groupDmId_userId_key" ON "GroupDmMember"("groupDmId", "userId");

-- CreateIndex
CREATE INDEX "GroupDmMessage_groupDmId_createdAt_idx" ON "GroupDmMessage"("groupDmId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupDmMessage_senderId_idx" ON "GroupDmMessage"("senderId");

-- CreateIndex
CREATE INDEX "Sticker_serverId_idx" ON "Sticker"("serverId");

-- CreateIndex
CREATE INDEX "Sticker_creatorId_idx" ON "Sticker"("creatorId");

-- CreateIndex
CREATE INDEX "Sticker_tags_idx" ON "Sticker"("tags");

-- CreateIndex
CREATE INDEX "StickerPack_creatorId_idx" ON "StickerPack"("creatorId");

-- AddForeignKey
ALTER TABLE "GroupDm" ADD CONSTRAINT "GroupDm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDmMember" ADD CONSTRAINT "GroupDmMember_groupDmId_fkey" FOREIGN KEY ("groupDmId") REFERENCES "GroupDm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDmMember" ADD CONSTRAINT "GroupDmMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDmMessage" ADD CONSTRAINT "GroupDmMessage_groupDmId_fkey" FOREIGN KEY ("groupDmId") REFERENCES "GroupDm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDmMessage" ADD CONSTRAINT "GroupDmMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_packId_fkey" FOREIGN KEY ("packId") REFERENCES "StickerPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StickerPack" ADD CONSTRAINT "StickerPack_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
