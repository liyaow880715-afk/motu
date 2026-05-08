-- Add accessKeyId to Project
ALTER TABLE "Project" ADD COLUMN "accessKeyId" TEXT;

-- CreateIndex
CREATE INDEX "Project_accessKeyId_createdAt_idx" ON "Project"("accessKeyId", "createdAt");

-- CreateTable AccessKey
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

-- CreateIndex
CREATE INDEX "AccessKey_type_idx" ON "AccessKey"("type");

-- CreateIndex
CREATE INDEX "AccessKey_createdAt_idx" ON "AccessKey"("createdAt");

-- CreateTable Template
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "referenceImageUrl" TEXT NOT NULL,
    "structureJson" JSONB NOT NULL,
    "styleProfile" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "rawAnalysis" TEXT,
    "moduleCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Template_createdAt_idx" ON "Template"("createdAt");
