const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { analysis: true, sections: true },
  });
  console.log('Total projects:', projects.length);
  for (const p of projects) {
    console.log('-', p.id, p.name, '| sections:', p.sections.length, '| analysis:', p.analysis ? 'yes' : 'no');
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
