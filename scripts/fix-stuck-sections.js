const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sectionIds = [
    'cmov2yblh005xvwz45p6qnbqa',
    'cmov2yblh005yvwz4j9rwr6s9',
    'cmov2yblh005zvwz4mvvlss7t',
    'cmov2yblh0060vwz4byl033tz',
    'cmov2yblh0061vwz47z0vjtxa'
  ];

  // Reset sections to IDLE
  const sectionResult = await prisma.pageSection.updateMany({
    where: { id: { in: sectionIds } },
    data: { status: 'IDLE' }
  });
  console.log(`Reset ${sectionResult.count} sections to IDLE`);

  // Reset tasks to FAILED
  const taskResult = await prisma.generationTask.updateMany({
    where: { sectionId: { in: sectionIds }, status: 'RUNNING' },
    data: { status: 'FAILED', errorMessage: '服务器重启导致任务中断', completedAt: new Date() }
  });
  console.log(`Reset ${taskResult.count} tasks to FAILED`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
