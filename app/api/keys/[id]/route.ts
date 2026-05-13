import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { remoteDeleteKey } from "@/lib/services/remote-auth";

const patchSchema = z.object({
  balance: z.number().int().optional(),
  label: z.string().optional(),
});

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!checkAdmin(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }

    const { id } = await params;
    const parsed = patchSchema.parse(await request.json());

    const existing = await prisma.accessKey.findUnique({ where: { id } });
    if (!existing) {
      return fail("NOT_FOUND", "Key 不存在", null, 404);
    }

    const updated = await prisma.accessKey.update({
      where: { id },
      data: {
        ...(parsed.balance !== undefined ? { balance: parsed.balance } : {}),
        ...(parsed.label !== undefined ? { label: parsed.label } : {}),
      },
    });

    return ok({
      id: updated.id,
      key: updated.key,
      type: updated.type,
      platform: updated.platform,
      label: updated.label,
      usedCount: updated.usedCount,
      balance: updated.balance,
      totalUsedCredits: updated.totalUsedCredits,
      activatedAt: updated.activatedAt?.toISOString() ?? null,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
