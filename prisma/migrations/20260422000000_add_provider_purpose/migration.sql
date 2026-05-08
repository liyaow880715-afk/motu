-- Add purpose column to ProviderConfig
ALTER TABLE "ProviderConfig" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'text';
