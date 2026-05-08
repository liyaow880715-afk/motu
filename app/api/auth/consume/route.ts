import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { remoteConsume } from "@/lib/services/remote-auth";

const consumeSchema = z.object({
  key: z.string().min(1, "请输入激活码"),
  machineId: z.string().optional(),
});

async function localConsume(key: string, machineId?: string | null) {
  const accessKey = await prisma.accessKey.findUnique({
    where: { key },
  });

  if (!accessKey) {
    return fail("INVALID_KEY", "激活码不存在", null, 401);
  }

  if (machineId && accessKey.machineId && accessKey.machineId !== machineId) {
    return fail("MACHINE_BOUND", "激活码已被其他设备使用", null, 403);
  }

  if (accessKey.type !== "PER_USE" && accessKey.expiresAt && new Date() > accessKey.expiresAt) {
    return fail("KEY_EXPIRED", "激活码已过期", null, 403);
  }

  if (accessKey.type !== "PER_USE") {
    return fail("NOT_PER_USE", "只有次卡需要消耗次数", null, 400);
  }

  if (accessKey.usedCount >= 1) {
    return fail("KEY_EXHAUSTED", "次卡已用完", null, 403);
  }

  const updated = await prisma.accessKey.update({
    where: { id: accessKey.id },
    data: { usedCount: { increment: 1 } },
  });

  return ok({
    id: updated.id,
    key: updated.key,
    type: updated.type,
    usedCount: updated.usedCount,
    activatedAt: updated.activatedAt?.toISOString() ?? null,
    expiresAt: updated.expiresAt?.toISOString() ?? null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = consumeSchema.parse(await request.json());

    // If remote auth server is configured, forward the request
    if (env.AUTH_SERVER_URL) {
      const remoteRes = await remoteConsume(parsed.key, parsed.machineId);
      if (!remoteRes.success) {
        return fail(
          remoteRes.error!.code,
          remoteRes.error!.message,
          null,
          remoteRes.error!.status || 500
        );
      }
      return ok(remoteRes.data);
    }

    // Otherwise use local database
    return await localConsume(parsed.key, parsed.machineId);
  } catch (error) {
    return handleRouteError(error);
  }
}
