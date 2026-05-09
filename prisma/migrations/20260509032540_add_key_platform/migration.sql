-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AccessKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "type" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'BOTH',
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "machineId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AccessKey" ("activatedAt", "createdAt", "expiresAt", "id", "key", "label", "machineId", "type", "usedCount") SELECT "activatedAt", "createdAt", "expiresAt", "id", "key", "label", "machineId", "type", "usedCount" FROM "AccessKey";
DROP TABLE "AccessKey";
ALTER TABLE "new_AccessKey" RENAME TO "AccessKey";
CREATE UNIQUE INDEX "AccessKey_key_key" ON "AccessKey"("key");
CREATE INDEX "AccessKey_type_idx" ON "AccessKey"("type");
CREATE INDEX "AccessKey_platform_idx" ON "AccessKey"("platform");
CREATE INDEX "AccessKey_createdAt_idx" ON "AccessKey"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
