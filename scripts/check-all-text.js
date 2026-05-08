const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const providers = await prisma.providerConfig.findMany({
    where: { purpose: 'text' },
    include: { models: true },
    orderBy: { createdAt: 'asc' }
  });
  for (const p of providers) {
    console.log('--- ID:', p.id, 'Name:', p.name, 'Active:', p.isActive, 'BaseURL:', p.baseUrl);
    console.log('    Models:', p.models.length);
    for (const m of p.models) {
      console.log('     -', m.modelId, 'planning:', m.isDefaultPlanning, 'analysis:', m.isDefaultAnalysis);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
