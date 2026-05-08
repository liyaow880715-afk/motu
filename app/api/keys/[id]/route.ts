import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { remoteDeleteKey } from "@/lib/services/remote-auth";

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== env.ADMIN_SECRET) {
    return false;
  }
  return true;
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!checkAdmin(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }

    const { id } = await params;

    // If remote auth server is configured, forward the request
    if (env.AUTH_SERVER_URL) {
      const adminSecret = request.headers.get("x-admin-secret")!;
      const remoteRes = await remoteDeleteKey(adminSecret, id);
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
    const existing = await prisma.accessKey.findUnique({ where: { id } });
    if (!existing) {
      return fail("NOT_FOUND", "Key 不存在", null, 404);
    }

    await prisma.accessKey.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
