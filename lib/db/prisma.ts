import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Recover stuck generation tasks on startup (e.g. after dev server crash/restart)
const STUCK_THRESHOLD_MINUTES = 10;
const hasRecovered = (globalThis as unknown as { __stuckTasksRecovered?: boolean }).__stuckTasksRecovered;

if (!hasRecovered) {
  (globalThis as unknown as { __stuckTasksRecovered?: boolean }).__stuckTasksRecovered = true;

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

  prisma.generationTask
    .findMany({
      where: {
        status: "RUNNING",
        startedAt: { lt: cutoff },
      },
      select: { id: true, sectionId: true },
    })
    .then(async (stuckTasks) => {
      if (stuckTasks.length === 0) return;

      const sectionIds = stuckTasks
        .map((t) => t.sectionId)
        .filter((id): id is string => !!id);

      await prisma.generationTask.updateMany({
        where: { id: { in: stuckTasks.map((t) => t.id) } },
        data: {
          status: "FAILED",
          errorMessage: "任务因服务器重启而中断",
          completedAt: new Date(),
        },
      });

      if (sectionIds.length > 0) {
        await prisma.pageSection.updateMany({
          where: {
            id: { in: sectionIds },
            status: "GENERATING",
          },
          data: { status: "IDLE" },
        });
      }

      console.log(`[Recovery] Reset ${stuckTasks.length} stuck generation tasks to FAILED`);
    })
    .catch((err) => {
      console.error("[Recovery] Failed to recover stuck tasks:", err);
    });
}
