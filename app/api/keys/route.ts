import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/utils/env";
import { nanoid } from "nanoid";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import {
  remoteListKeys,
  remoteCreateKeys,
} from "@/lib/services/remote-auth";

const createSchema = z.object({
  type: z.enum(["PER_USE", "DAILY", "MONTHLY"]),
  count: z.number().int().min(1).max(100).default(1),
  label: z.string().optional(),
});

function generateKey(): string {
  return `BM-${nanoid(16).toUpperCase()}`;
}

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
      const remoteRes = await remoteListKeys(adminSecret);
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
    const keys = await prisma.accessKey.findMany({
      orderBy: { createdAt: "desc" },
    });

    return ok(
      keys.map((k) => ({
        id: k.id,
        key: k.key,
        type: k.type,
        label: k.label,
        usedCount: k.usedCount,
        activatedAt: k.activatedAt?.toISOString() ?? null,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }

    const parsed = createSchema.parse(await request.json());

    // If remote auth server is configured, forward the request
    if (env.AUTH_SERVER_URL) {
      const adminSecret = request.headers.get("x-admin-secret")!;
      const remoteRes = await remoteCreateKeys(adminSecret, parsed);
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
    const created: Array<{
      id: string;
      key: string;
      type: string;
      label: string | null;
      createdAt: Date;
    }> = [];

    for (let i = 0; i < parsed.count; i++) {
      const record = await prisma.accessKey.create({
        data: {
          key: generateKey(),
          type: parsed.type,
          label: parsed.label || null,
        },
      });
      created.push(record);
    }

    return ok(
      created.map((k) => ({
        id: k.id,
        key: k.key,
        type: k.type,
        label: k.label,
        createdAt: k.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
