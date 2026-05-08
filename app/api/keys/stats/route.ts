import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { remoteGetStats } from "@/lib/services/remote-auth";

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== env.ADMIN_SECRET) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }

    // If remote auth server is configured, forward the request
    if (env.AUTH_SERVER_URL) {
      const adminSecret = request.headers.get("x-admin-secret")!;
      const remoteRes = await remoteGetStats(adminSecret);
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

    // Otherwise compute from local database
    const total = await prisma.accessKey.count();
    const activated = await prisma.accessKey.count({ where: { activatedAt: { not: null } } });
    const expired = await prisma.accessKey.count({
      where: {
        type: { not: "PER_USE" },
        expiresAt: { lt: new Date() },
      },
    });
    const perUseUsed = await prisma.accessKey.count({
      where: { type: "PER_USE", usedCount: { gte: 1 } },
    });

    return ok({
      total,
      activated,
      expired,
      perUseUsed,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
