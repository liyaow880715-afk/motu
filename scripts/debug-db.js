const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const providers = await prisma.providerConfig.findMany({ include: { models: true } });
  console.log('Provider count:', providers.length);
  for (const p of providers) {
    console.log('--- Provider:', p.name, 'purpose:', p.purpose, 'isActive:', p.isActive);
    console.log('  models:', p.models.length);
    for (const m of p.models) {
      console.log('  -', m.modelId, 'planning:', m.isDefaultPlanning, 'analysis:', m.isDefaultAnalysis, 'caps:', JSON.stringify(m.capabilities));
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
