const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.generationTask.findMany({
    where: { status: { in: ['RUNNING', 'PENDING'] } },
  });
  console.log('Found', tasks.length, 'unfinished tasks');
  for (const t of tasks) {
    await prisma.generationTask.update({
      where: { id: t.id },
      data: { status: 'FAILED', errorMessage: 'Cleared by admin' },
    });
    console.log('Cleared task:', t.id, t.taskType, t.sectionId || '-');
  }
  const sections = await prisma.pageSection.updateMany({
    where: { status: 'GENERATING' },
    data: { status: 'PLANNED' },
  });
  console.log('Reset', sections.count, 'sections from GENERATING to PLANNED');
}
main().catch(console.error).finally(() => prisma.$disconnect());
