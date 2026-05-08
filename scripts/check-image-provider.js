const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.providerConfig.findFirst({ where: { purpose: 'image', isActive: true }, include: { models: true } });
  if (!p) { console.log('No active image provider'); return; }
  console.log('Active image provider:');
  console.log('  ID:', p.id);
  console.log('  Name:', p.name);
  console.log('  BaseURL:', p.baseUrl);
  console.log('  Models:', p.models.length);
  for (const m of p.models) {
    console.log('   -', m.modelId);
    console.log('     label:', m.label);
    console.log('     capabilities:', JSON.stringify(m.capabilities));
    console.log('     isDefaultHeroImage:', m.isDefaultHeroImage);
    console.log('     isDefaultDetailImage:', m.isDefaultDetailImage);
    console.log('     isDefaultImageEdit:', m.isDefaultImageEdit);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
