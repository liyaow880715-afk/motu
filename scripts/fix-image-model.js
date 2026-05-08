const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.providerConfig.findFirst({ where: { purpose: 'image', isActive: true }, include: { models: true } });
  if (!p) { console.log('No active image provider'); return; }
  for (const m of p.models) {
    const caps = { ...m.capabilities };
    caps.__imageGenerationStatus = 'available';
    caps.real_image_gen = true;
    await prisma.modelProfile.update({ where: { id: m.id }, data: { capabilities: caps } });
    console.log('Updated', m.modelId, 'capabilities:', JSON.stringify(caps));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
