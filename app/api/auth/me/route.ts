import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { remoteGetMe } from "@/lib/services/remote-auth";

async function localGetMe(key: string) {
  const accessKey = await prisma.accessKey.findUnique({
    where: { key },
  });

  if (!accessKey) {
    return fail("INVALID_KEY", "激活码不存在", null, 401);
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
    activatedAt: accessKey.activatedAt?.toISOString() ?? null,
    expiresAt: accessKey.expiresAt?.toISOString() ?? null,
  });
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      return fail("MISSING_KEY", "缺少激活码", null, 401);
    }

    // If remote auth server is configured, forward the request
    if (env.AUTH_SERVER_URL) {
      const remoteRes = await remoteGetMe(key);
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
    return await localGetMe(key);
  } catch (error) {
    return handleRouteError(error);
  }
}
