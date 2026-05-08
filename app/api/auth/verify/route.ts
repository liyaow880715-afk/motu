import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { remoteVerify } from "@/lib/services/remote-auth";

const verifySchema = z.object({
  key: z.string().min(1, "请输入激活码"),
});

function computeExpiresAt(type: string, activatedAt: Date): Date | null {
  if (type === "PER_USE") return null;
  const d = new Date(activatedAt);
  if (type === "DAILY") {
    d.setDate(d.getDate() + 1);
  } else if (type === "MONTHLY") {
    d.setDate(d.getDate() + 30);
  }
  return d;
}

async function localVerify(key: string) {
  const accessKey = await prisma.accessKey.findUnique({
    where: { key },
  });

  if (!accessKey) {
    return fail("INVALID_KEY", "激活码不存在", null, 401);
  }

  let { activatedAt, expiresAt } = accessKey;

  // First-time activation
  if (!activatedAt) {
    activatedAt = new Date();
    expiresAt = computeExpiresAt(accessKey.type, activatedAt);
    await prisma.accessKey.update({
      where: { id: accessKey.id },
      data: { activatedAt, expiresAt },
    });
  }

  // Check expiration for daily/monthly
  if (accessKey.type !== "PER_USE" && expiresAt && new Date() > expiresAt) {
    return fail("KEY_EXPIRED", "激活码已过期，请更换新的激活码", null, 403);
  }

  return ok({
    id: accessKey.id,
    key: accessKey.key,
    type: accessKey.type,
    label: accessKey.label,
    usedCount: accessKey.usedCount,
    activatedAt: activatedAt?.toISOString() ?? null,
    expiresAt: expiresAt?.toISOString() ?? null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = verifySchema.parse(await request.json());

    // If remote auth server is configured, forward the request
    if (env.AUTH_SERVER_URL) {
      const remoteRes = await remoteVerify(parsed.key);
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
    return await localVerify(parsed.key);
  } catch (error) {
    return handleRouteError(error);
  }
}
