const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = [
    'cmov2yblh005xvwz45p6qnbqa',
    'cmov2yblh005yvwz4j9rwr6s9',
    'cmov2yblh005zvwz4mvvlss7t',
    'cmov2yblh0060vwz4byl033tz',
    'cmov2yblh0061vwz47z0vjtxa'
  ];
  const rows = await prisma.generationTask.findMany({
    where: { sectionId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      sectionId: true,
      status: true,
      taskType: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    }
  });
  console.table(rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
