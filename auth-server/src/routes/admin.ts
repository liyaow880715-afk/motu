import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "../db";

const router = Router();

function ok<T>(data: T) {
  return { success: true as const, data };
}

function fail(code: string, message: string, status: number) {
  return { success: false as const, error: { code, message, status } };
}

function generateKey(): string {
  return `BM-${randomBytes(16).toString("hex").toUpperCase()}`;
}

function checkAdmin(req: any): boolean {
  const secret = req.headers["x-admin-secret"];
  const expected = process.env.ADMIN_SECRET || "banana-admin";
  return secret === expected;
}

// GET /api/keys
router.get("/keys", async (req, res) => {
  try {
    if (!checkAdmin(req)) {
      return res.status(403).json(fail("UNAUTHORIZED", "管理员密码错误", 403));
    }

    const keys = await prisma.accessKey.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json(ok(
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
    ));
  } catch (error: any) {
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

// POST /api/keys
router.post("/keys", async (req, res) => {
  try {
    if (!checkAdmin(req)) {
      return res.status(403).json(fail("UNAUTHORIZED", "管理员密码错误", 403));
    }

    const schema = z.object({
      type: z.enum(["PER_USE", "DAILY", "MONTHLY"]),
      count: z.number().int().min(1).max(100).default(1),
      label: z.string().optional(),
    });
    const parsed = schema.parse(req.body);

    const created = [];
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

    return res.json(ok(
      created.map((k) => ({
        id: k.id,
        key: k.key,
        type: k.type,
        label: k.label,
        createdAt: k.createdAt.toISOString(),
      }))
    ));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(fail("VALIDATION_ERROR", error.issues[0]?.message || "参数错误", 400));
    }
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

// DELETE /api/keys/:id
router.delete("/keys/:id", async (req, res) => {
  try {
    if (!checkAdmin(req)) {
      return res.status(403).json(fail("UNAUTHORIZED", "管理员密码错误", 403));
    }

    const { id } = req.params;
    await prisma.accessKey.delete({ where: { id } });

    return res.json(ok({ deleted: true }));
  } catch (error: any) {
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

// GET /api/stats
router.get("/stats", async (req, res) => {
  try {
    if (!checkAdmin(req)) {
      return res.status(403).json(fail("UNAUTHORIZED", "管理员密码错误", 403));
    }

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

    return res.json(ok({
      total,
      activated,
      expired,
      perUseUsed,
    }));
  } catch (error: any) {
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

export default router;
