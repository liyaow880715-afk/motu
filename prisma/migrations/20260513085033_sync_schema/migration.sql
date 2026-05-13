-- CreateTable
CREATE TABLE "ModelTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "characterPrompt" TEXT NOT NULL,
    "frontViewPath" TEXT NOT NULL,
    "backViewPath" TEXT NOT NULL,
    "sideViewPath" TEXT NOT NULL,
    "bodyType" TEXT,
    "heightCm" INTEGER,
    "styleTags" JSONB,
    "seed" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OutfitShoot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clothingType" TEXT NOT NULL,
    "clothingAssets" JSONB NOT NULL,
    "resultImages" JSONB,
    "sceneStyle" TEXT,
    "accessories" JSONB,
    "background" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutfitShoot_modelTemplateId_fkey" FOREIGN KEY ("modelTemplateId") REFERENCES "ModelTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalUsedCredits" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "machineId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AccessKey" ("activatedAt", "createdAt", "expiresAt", "id", "key", "label", "machineId", "platform", "type", "usedCount") SELECT "activatedAt", "createdAt", "expiresAt", "id", "key", "label", "machineId", "platform", "type", "usedCount" FROM "AccessKey";
DROP TABLE "AccessKey";
ALTER TABLE "new_AccessKey" RENAME TO "AccessKey";
CREATE UNIQUE INDEX "AccessKey_key_key" ON "AccessKey"("key");
CREATE INDEX "AccessKey_type_idx" ON "AccessKey"("type");
CREATE INDEX "AccessKey_platform_idx" ON "AccessKey"("platform");
CREATE INDEX "AccessKey_createdAt_idx" ON "AccessKey"("createdAt");
CREATE TABLE "new_ModelProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerConfigId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capabilities" JSONB NOT NULL,
    "roles" JSONB NOT NULL,
    "quality" TEXT,
    "latency" TEXT,
    "cost" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isDefaultAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultPlanning" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultHeroImage" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultDetailImage" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultImageEdit" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultVideoScript" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultVideoVLM" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelProfile_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "ProviderConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ModelProfile" ("capabilities", "cost", "createdAt", "id", "isAvailable", "isDefaultAnalysis", "isDefaultDetailImage", "isDefaultHeroImage", "isDefaultImageEdit", "isDefaultPlanning", "label", "latency", "modelId", "providerConfigId", "quality", "roles", "updatedAt") SELECT "capabilities", "cost", "createdAt", "id", "isAvailable", "isDefaultAnalysis", "isDefaultDetailImage", "isDefaultHeroImage", "isDefaultImageEdit", "isDefaultPlanning", "label", "latency", "modelId", "providerConfigId", "quality", "roles", "updatedAt" FROM "ModelProfile";
DROP TABLE "ModelProfile";
ALTER TABLE "new_ModelProfile" RENAME TO "ModelProfile";
CREATE INDEX "ModelProfile_providerConfigId_idx" ON "ModelProfile"("providerConfigId");
CREATE UNIQUE INDEX "ModelProfile_providerConfigId_modelId_key" ON "ModelProfile"("providerConfigId", "modelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ModelTemplate_bodyType_idx" ON "ModelTemplate"("bodyType");

-- CreateIndex
CREATE INDEX "ModelTemplate_createdAt_idx" ON "ModelTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "OutfitShoot_modelTemplateId_idx" ON "OutfitShoot"("modelTemplateId");

-- CreateIndex
CREATE INDEX "OutfitShoot_status_idx" ON "OutfitShoot"("status");

-- CreateIndex
CREATE INDEX "OutfitShoot_createdAt_idx" ON "OutfitShoot"("createdAt");
