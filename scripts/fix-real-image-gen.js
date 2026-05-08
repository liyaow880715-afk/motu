const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Only image2 (yijiarj chat-completions image gen) and actual image_gen models should have real_image_gen=true
// But we need to be conservative: only models we've verified work
const VERIFIED_IMAGE_MODELS = new Set(['image2']);

async function main() {
  const models = await prisma.modelProfile.findMany();
  console.log('Fixing', models.length, 'models...');
  for (const m of models) {
    const caps = { ...(m.capabilities || {}) };
    const shouldBeReal = VERIFIED_IMAGE_MODELS.has(m.modelId);
    if (caps.real_image_gen !== shouldBeReal) {
      caps.real_image_gen = shouldBeReal;
      await prisma.modelProfile.update({ where: { id: m.id }, data: { capabilities: caps } });
      console.log('Updated', m.modelId, 'real_image_gen =', shouldBeReal);
    } else {
      console.log('Skip  ', m.modelId, 'real_image_gen =', caps.real_image_gen);
    }
  }
  console.log('Done');
}
main().catch(console.error).finally(() => prisma.$disconnect());
