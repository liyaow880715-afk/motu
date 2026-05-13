import { prisma } from "@/lib/db/prisma";
import { getCreditCost } from "@/lib/services/config-service";

export async function getCallCost(): Promise<number> {
  return getCreditCost();
}

export async function checkAndDeductCredits(accessKey: string, amount?: number) {
  const cost = amount ?? (await getCreditCost());

  const key = await prisma.accessKey.findUnique({
    where: { key: accessKey },
    select: { id: true, balance: true },
  });

  if (!key) {
    throw new Error("激活码不存在");
  }

  // Atomic update: only succeed if balance >= cost (race-condition safe)
  const updated = await prisma.accessKey.updateMany({
    where: { id: key.id, balance: { gte: cost } },
    data: {
      balance: { decrement: cost },
      totalUsedCredits: { increment: cost },
    },
  });

  if (updated.count === 0) {
    throw new Error(`积分不足，当前余额 ${key.balance}，需要 ${cost}`);
  }

  return key.balance - cost;
}

export async function refundCredits(accessKey: string, amount?: number) {
  const cost = amount ?? (await getCreditCost());

  const key = await prisma.accessKey.findUnique({
    where: { key: accessKey },
  });

  if (!key) {
    return;
  }

  await prisma.accessKey.update({
    where: { id: key.id },
    data: {
      balance: { increment: cost },
      totalUsedCredits: {
        set: Math.max(0, key.totalUsedCredits - cost),
      },
    },
  });
}

export async function getCreditBalance(accessKey: string): Promise<number> {
  const key = await prisma.accessKey.findUnique({
    where: { key: accessKey },
    select: { balance: true },
  });

  return key?.balance ?? 0;
}
