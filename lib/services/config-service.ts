import { prisma } from "@/lib/db/prisma";

const DEFAULT_CREDIT_COST = "20";

export async function getConfigValue(key: string, defaultValue: string): Promise<string> {
  const config = await prisma.systemConfig.findUnique({
    where: { key },
  });
  return config?.value ?? defaultValue;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getCreditCost(): Promise<number> {
  const raw = await getConfigValue("creditCostPerCall", DEFAULT_CREDIT_COST);
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 1 ? parseInt(DEFAULT_CREDIT_COST, 10) : parsed;
}

export async function setCreditCost(cost: number): Promise<void> {
  await setConfigValue("creditCostPerCall", String(cost));
}
