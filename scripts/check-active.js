const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.providerConfig.findFirst({ where: { purpose: 'text', isActive: true }, include: { models: true } });
  console.log('Active text provider:', p.name, p.id);
  for (const m of p.models) {
    console.log(' -', m.modelId, 'planning:', m.isDefaultPlanning, 'analysis:', m.isDefaultAnalysis);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
