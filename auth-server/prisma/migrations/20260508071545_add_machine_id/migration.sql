-- CreateTable
CREATE TABLE "AccessKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "type" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "machineId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessKey_key_key" ON "AccessKey"("key");
