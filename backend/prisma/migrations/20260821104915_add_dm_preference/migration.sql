-- CreateTable
CREATE TABLE "DmPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dmId" TEXT NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "showAvatar" BOOLEAN NOT NULL DEFAULT true,
    "showDisplayName" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DmPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmPreference_userId_idx" ON "DmPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DmPreference_userId_dmId_key" ON "DmPreference"("userId", "dmId");

-- AddForeignKey
ALTER TABLE "DmPreference" ADD CONSTRAINT "DmPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
