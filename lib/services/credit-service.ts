import { prisma } from "@/lib/db/prisma";

const COST_PER_CALL = 20;

export function getCallCost(): number {
  return COST_PER_CALL;
}

export async function checkAndDeductCredits(accessKey: string, amount = COST_PER_CALL) {
  const key = await prisma.accessKey.findUnique({
    where: { key: accessKey },
  });

  if (!key) {
    throw new Error("激活码不存在");
  }

  if (key.balance < amount) {
    throw new Error(`积分不足，当前余额 ${key.balance}，需要 ${amount}`);
  }

  await prisma.accessKey.update({
    where: { id: key.id },
    data: {
      balance: { decrement: amount },
      totalUsedCredits: { increment: amount },
    },
  });

  return key.balance - amount;
}

export async function refundCredits(accessKey: string, amount = COST_PER_CALL) {
  const key = await prisma.accessKey.findUnique({
    where: { key: accessKey },
  });

  if (!key) {
    return;
  }

  await prisma.accessKey.update({
    where: { id: key.id },
    data: {
      balance: { increment: amount },
      totalUsedCredits: {
        set: Math.max(0, key.totalUsedCredits - amount),
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
