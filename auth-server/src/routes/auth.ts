import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { getPublicKey, signData } from "../lib/sign";

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

// GET /api/auth/public-key
router.get("/public-key", (_req, res) => {
  try {
    return res.json(ok({ key: getPublicKey() }));
  } catch (error: any) {
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

function checkPlatform(keyPlatform: string, clientPlatform?: string): string | null {
  if (keyPlatform === "BOTH") return null;
  const client = clientPlatform?.toLowerCase();
  if (keyPlatform === "DESKTOP_ONLY" && client !== "desktop") {
    return "该激活码仅限客户端使用";
  }
  if (keyPlatform === "WEB_ONLY" && client !== "web") {
    return "该激活码仅限网页端使用";
  }
  return null;
}

// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  try {
    const schema = z.object({
      key: z.string().min(1, "请输入激活码"),
      machineId: z.string().optional(),
      platform: z.string().optional(),
    });
    const parsed = schema.parse(req.body);

    const accessKey = await prisma.accessKey.findUnique({
      where: { key: parsed.key },
    });

    if (!accessKey) {
      return res.status(401).json(fail("INVALID_KEY", "激活码不存在", 401));
    }

    // Platform check
    const platformError = checkPlatform(accessKey.platform, parsed.platform);
    if (platformError) {
      return res.status(403).json(fail("PLATFORM_MISMATCH", platformError, 403));
    }

    // Machine binding check
    if (parsed.machineId) {
      if (accessKey.machineId && accessKey.machineId !== parsed.machineId) {
        return res.status(403).json(fail("MACHINE_BOUND", "激活码已被其他设备使用", 403));
      }
    }

    let { activatedAt, expiresAt } = accessKey;

    // First-time activation
    if (!activatedAt) {
      activatedAt = new Date();
      expiresAt = computeExpiresAt(accessKey.type, activatedAt);
      await prisma.accessKey.update({
        where: { id: accessKey.id },
        data: { activatedAt, expiresAt, machineId: parsed.machineId || accessKey.machineId },
      });
    } else if (parsed.machineId && !accessKey.machineId) {
      // Bind machine on first verify after schema migration
      await prisma.accessKey.update({
        where: { id: accessKey.id },
        data: { machineId: parsed.machineId },
      });
    }

    // Check expiration
    if (accessKey.type !== "PER_USE" && expiresAt && new Date() > expiresAt) {
      return res.status(403).json(fail("KEY_EXPIRED", "激活码已过期，请更换新的激活码", 403));
    }

    const payload = {
      key: accessKey.key,
      type: accessKey.type,
      platform: accessKey.platform,
      label: accessKey.label,
      usedCount: accessKey.usedCount,
      balance: accessKey.balance,
      totalUsedCredits: accessKey.totalUsedCredits,
      activatedAt: activatedAt?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      machineId: parsed.machineId || accessKey.machineId || null,
      timestamp: new Date().toISOString(),
    };

    return res.json(ok({
      ...payload,
      signature: signData(payload),
    }));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(fail("VALIDATION_ERROR", error.issues[0]?.message || "参数错误", 400));
    }
    return res.status(500).json(fail("INTERNAL_ERROR", error.message || "服务器内部错误", 500));
  }
});

// POST /api/auth/heartbeat
router.post("/heartbeat", async (req, res) => {
  try {
    const schema = z.object({
      key: z.string().min(1, "缺少激活码"),
      machineId: z.string().optional(),
      platform: z.string().optional(),
    });
    const parsed = schema.parse(req.body);

    const accessKey = await prisma.accessKey.findUnique({
      where: { key: parsed.key },
    });

    if (!accessKey) {
      return res.status(401).json(fail("INVALID_KEY", "激活码不存在", 401));
    }

    const platformError = checkPlatform(accessKey.platform, parsed.platform);
    if (platformError) {
      return res.status(403).json(fail("PLATFORM_MISMATCH", platformError, 403));
    }

    if (parsed.machineId && accessKey.machineId && accessKey.machineId !== parsed.machineId) {
      return res.status(403).json(fail("MACHINE_BOUND", "激活码已被其他设备使用", 403));
    }

    if (accessKey.type !== "PER_USE" && accessKey.expiresAt && new Date() > accessKey.expiresAt) {
      return res.status(403).json(fail("KEY_EXPIRED", "激活码已过期", 403));
    }

    const payload = {
      key: accessKey.key,
      type: accessKey.type,
      platform: accessKey.platform,
      balance: accessKey.balance,
      totalUsedCredits: accessKey.totalUsedCredits,
      expiresAt: accessKey.expiresAt?.toISOString() ?? null,
      activatedAt: accessKey.activatedAt?.toISOString() ?? null,
      machineId: accessKey.machineId,
      timestamp: new Date().toISOString(),
    };

    return res.json(ok({
      status: "active",
      ...payload,
      signature: signData(payload),
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
    const machineId = req.query.machineId as string | undefined;
    const platform = req.query.platform as string | undefined;
    if (!key) {
      return res.status(401).json(fail("MISSING_KEY", "缺少激活码", 401));
    }

    const accessKey = await prisma.accessKey.findUnique({
      where: { key },
    });

    if (!accessKey) {
      return res.status(401).json(fail("INVALID_KEY", "激活码不存在", 401));
    }

    const platformError = checkPlatform(accessKey.platform, platform);
    if (platformError) {
      return res.status(403).json(fail("PLATFORM_MISMATCH", platformError, 403));
    }

    if (accessKey.type !== "PER_USE" && accessKey.expiresAt && new Date() > accessKey.expiresAt) {
      return res.status(403).json(fail("KEY_EXPIRED", "激活码已过期", 403));
    }

    if (machineId && accessKey.machineId && accessKey.machineId !== machineId) {
      return res.status(403).json(fail("MACHINE_BOUND", "激活码已被其他设备使用", 403));
    }

    return res.json(ok({
      id: accessKey.id,
      key: accessKey.key,
      type: accessKey.type,
      platform: accessKey.platform,
      label: accessKey.label,
      usedCount: accessKey.usedCount,
      balance: accessKey.balance,
      totalUsedCredits: accessKey.totalUsedCredits,
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
    const schema = z.object({ key: z.string().min(1), machineId: z.string().optional(), platform: z.string().optional() });
    const parsed = schema.parse(req.body);

    const accessKey = await prisma.accessKey.findUnique({
      where: { key: parsed.key },
    });

    if (!accessKey) {
      return res.status(401).json(fail("INVALID_KEY", "激活码不存在", 401));
    }

    const platformError = checkPlatform(accessKey.platform, parsed.platform);
    if (platformError) {
      return res.status(403).json(fail("PLATFORM_MISMATCH", platformError, 403));
    }

    if (parsed.machineId && accessKey.machineId && accessKey.machineId !== parsed.machineId) {
      return res.status(403).json(fail("MACHINE_BOUND", "激活码已被其他设备使用", 403));
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
      platform: updated.platform,
      usedCount: updated.usedCount,
      balance: updated.balance,
      totalUsedCredits: updated.totalUsedCredits,
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
