const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.pageSection.findMany({
    where: { projectId: 'cmov2jquj005evwz4wapc7u1v' },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      sectionKey: true,
      type: true,
      status: true,
      updatedAt: true,
      currentImageAssetId: true,
      title: true,
    }
  });
  console.table(rows.map(r => ({
    ...r,
    updatedAt: r.updatedAt.toISOString()
  })));
}

main().catch(e => { console.error(e); }).finally(() => prisma.$disconnect());
