import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { remoteGetMe } from "@/lib/services/remote-auth";

async function localGetMe(key: string, machineId?: string | null) {
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

  return ok({
    id: accessKey.id,
    key: accessKey.key,
    type: accessKey.type,
    label: accessKey.label,
    usedCount: accessKey.usedCount,
    balance: accessKey.balance,
    activatedAt: accessKey.activatedAt?.toISOString() ?? null,
    expiresAt: accessKey.expiresAt?.toISOString() ?? null,
  });
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    const machineId = request.nextUrl.searchParams.get("machineId");

    if (!key) {
      return fail("MISSING_KEY", "缺少激活码", null, 401);
    }

    // If remote auth server is configured, forward the request
    if (env.AUTH_SERVER_URL) {
      const remoteRes = await remoteGetMe(key, machineId);
      if (!remoteRes.success) {
        return fail(
          remoteRes.error!.code,
          remoteRes.error!.message,
          null,
          remoteRes.error!.status || 500
        );
      }
      const data = remoteRes.data;
      // Sync remote key to local DB for credit tracking if not exists
      if (data) {
        await prisma.accessKey.upsert({
          where: { key },
          update: {
            balance: data.balance ?? 0,
            totalUsedCredits: data.totalUsedCredits ?? 0,
            activatedAt: data.activatedAt ? new Date(data.activatedAt) : undefined,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            machineId: machineId || undefined,
          },
          create: {
            key: data.key,
            type: data.type,
            platform: data.platform,
            label: data.label || null,
            balance: data.balance ?? 0,
            totalUsedCredits: data.totalUsedCredits ?? 0,
            activatedAt: data.activatedAt ? new Date(data.activatedAt) : null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            machineId: machineId || null,
          },
        });
      }
      return ok(data);
    }

    // Otherwise use local database
    return await localGetMe(key, machineId);
  } catch (error) {
    return handleRouteError(error);
  }
}
