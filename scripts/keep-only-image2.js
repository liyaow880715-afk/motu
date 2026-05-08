const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.providerConfig.findFirst({ where: { purpose: 'image', isActive: true }, include: { models: true } });
  if (!p) { console.log('No active image provider'); return; }

  let kept = 0;
  let deleted = 0;
  for (const m of p.models) {
    if (m.modelId === 'image2') {
      // Ensure image2 is the default for all image roles
      await prisma.modelProfile.update({
        where: { id: m.id },
        data: {
          isDefaultHeroImage: true,
          isDefaultDetailImage: true,
          isDefaultImageEdit: true,
          isDefaultAnalysis: false,
          isDefaultPlanning: false,
        },
      });
      kept++;
      console.log('Kept image2, set as default for all image roles');
    } else {
      await prisma.modelProfile.delete({ where: { id: m.id } });
      deleted++;
      console.log('Deleted', m.modelId);
    }
  }
  console.log('Done. Kept:', kept, 'Deleted:', deleted);
}
main().catch(console.error).finally(() => prisma.$disconnect());
