import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

const router = Router();

function ok<T>(data: T) {
  return { success: true as const, data };
}

function fail(code: string, message: string, status: number) {
  return { success: false as const, error: { code, message, status } };
}

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

// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  try {
    const schema = z.object({ key: z.string().min(1, "请输入激活码") });
    const parsed = schema.parse(req.body);

    const accessKey = await prisma.accessKey.findUnique({
      where: { key: parsed.key },
    });

    if (!accessKey) {
      return res.status(401).json(fail("INVALID_KEY", "激活码不存在", 401));
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

    // Check expiration
    if (accessKey.type !== "PER_USE" && expiresAt && new Date() > expiresAt) {
      return res.status(403).json(fail("KEY_EXPIRED", "激活码已过期，请更换新的激活码", 403));
    }

    return res.json(ok({
      id: accessKey.id,
      key: accessKey.key,
      type: accessKey.type,
      label: accessKey.label,
      usedCount: accessKey.usedCount,
      activatedAt: activatedAt?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
    }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(fail("VALIDATION_ERROR", error.issues[0]?.message || "参数错误", 400));
    }
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const key = req.query.key as string;
    if (!key) {
      return res.status(401).json(fail("MISSING_KEY", "缺少激活码", 401));
    }

    const accessKey = await prisma.accessKey.findUnique({
      where: { key },
    });

    if (!accessKey) {
      return res.status(401).json(fail("INVALID_KEY", "激活码不存在", 401));
    }

    if (accessKey.type !== "PER_USE" && accessKey.expiresAt && new Date() > accessKey.expiresAt) {
      return res.status(403).json(fail("KEY_EXPIRED", "激活码已过期", 403));
    }

    return res.json(ok({
      id: accessKey.id,
      key: accessKey.key,
      type: accessKey.type,
      label: accessKey.label,
      usedCount: accessKey.usedCount,
      activatedAt: accessKey.activatedAt?.toISOString() ?? null,
      expiresAt: accessKey.expiresAt?.toISOString() ?? null,
    }));
  } catch (error: any) {
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

// POST /api/auth/consume
router.post("/consume", async (req, res) => {
  try {
    const schema = z.object({ key: z.string().min(1) });
    const parsed = schema.parse(req.body);

    const accessKey = await prisma.accessKey.findUnique({
      where: { key: parsed.key },
    });

    if (!accessKey) {
      return res.status(401).json(fail("INVALID_KEY", "激活码不存在", 401));
    }

    if (accessKey.type !== "PER_USE" && accessKey.expiresAt && new Date() > accessKey.expiresAt) {
      return res.status(403).json(fail("KEY_EXPIRED", "激活码已过期", 403));
    }

    if (accessKey.type !== "PER_USE") {
      return res.status(400).json(fail("NOT_PER_USE", "只有次卡需要消耗次数", 400));
    }

    if (accessKey.usedCount >= 1) {
      return res.status(403).json(fail("KEY_EXHAUSTED", "次卡已用完", 403));
    }

    const updated = await prisma.accessKey.update({
      where: { id: accessKey.id },
      data: { usedCount: { increment: 1 } },
    });

    return res.json(ok({
      id: updated.id,
      key: updated.key,
      type: updated.type,
      usedCount: updated.usedCount,
      activatedAt: updated.activatedAt?.toISOString() ?? null,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
    }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(fail("VALIDATION_ERROR", error.issues[0]?.message || "参数错误", 400));
    }
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

export default router;
