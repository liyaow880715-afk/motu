const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.providerConfig.updateMany({ where: { purpose: 'text' }, data: { isActive: false } });
  await prisma.providerConfig.update({ where: { id: 'cmo9prxlt0000vw68xbpe8k9v' }, data: { isActive: true } });
  console.log('Switched to GLM provider');
  const p = await prisma.providerConfig.findFirst({ where: { purpose: 'text', isActive: true }, include: { models: true } });
  console.log('Now active:', p.name, p.baseUrl);
  for (const m of p.models) {
    console.log(' -', m.modelId, 'planning:', m.isDefaultPlanning, 'analysis:', m.isDefaultAnalysis);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
