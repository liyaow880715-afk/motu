const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const providers = await prisma.providerConfig.findMany({ where: { purpose: 'text' } });
  console.log('Text providers:', providers.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));

  const glmProvider = providers.find(p => p.isActive === false);
  const kimiProvider = providers.find(p => p.isActive === true);

  if (glmProvider) {
    await prisma.providerConfig.updateMany({ where: { purpose: 'text' }, data: { isActive: false } });
    await prisma.providerConfig.update({ where: { id: glmProvider.id }, data: { isActive: true } });
    console.log('Switched active text provider to:', glmProvider.name, glmProvider.id);
  }
  if (kimiProvider) {
    console.log('Deactivated:', kimiProvider.name, kimiProvider.id);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
