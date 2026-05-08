const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const activeText = await prisma.providerConfig.findFirst({ where: { purpose: 'text', isActive: true }, include: { models: true } });
  if (!activeText) { console.log('No active text provider'); return; }
  console.log('Active text provider:', activeText.name, 'models:', activeText.models.length);
  for (const m of activeText.models) {
    await prisma.modelProfile.update({ where: { id: m.id }, data: { isDefaultPlanning: true, isDefaultAnalysis: true } });
    console.log('Set', m.modelId, 'isDefaultPlanning=true, isDefaultAnalysis=true');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
