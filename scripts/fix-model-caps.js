const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function detectCapabilities(modelId) {
  const id = modelId.toLowerCase();
  const map = {
    text: false, vision: false, image_gen: false, image_edit: false,
    structured_output: false, fast: false, cheap: false, high_quality: false,
  };

  if (/(gpt|gemini|claude|qwen|glm|deepseek|chat|instruct|command|llama|mistral|kimi|moonshot)/.test(id)) {
    map.text = true;
    map.structured_output = true;
  }
  if (/(vision|vl|4o|omni|gemini|multimodal|qwen-vl)/.test(id)) {
    map.vision = true;
    map.text = true;
    map.structured_output = true;
  }
  if (/(image|imagen|flux|sdxl|stable-diffusion|banana|nano-banana|recraft)/.test(id)) {
    map.image_gen = true;
    map.high_quality = true;
  }
  if (/(edit|inpaint|mask)/.test(id)) {
    map.image_edit = true;
  }
  if (/(flash|mini|nano|lite|turbo|instant)/.test(id)) {
    map.fast = true;
    map.cheap = true;
  }
  if (/(pro|ultra|4\.1|opus|quality|max)/.test(id)) {
    map.high_quality = true;
  }
  if (!Object.values(map).some(Boolean)) {
    map.text = true;
  }
  return map;
}

async function main() {
  const models = await prisma.modelProfile.findMany();
  console.log('Fixing', models.length, 'models...');
  for (const m of models) {
    const newCaps = detectCapabilities(m.modelId);
    const oldCaps = m.capabilities || {};
    // Preserve image probe status
    const merged = { ...newCaps };
    ['__imageGenerationStatus', '__imageEditStatus', '__probeNote', 'real_image_gen', 'real_image_edit'].forEach(k => {
      if (oldCaps[k] !== undefined) merged[k] = oldCaps[k];
    });
    if (JSON.stringify(merged) !== JSON.stringify(oldCaps)) {
      await prisma.modelProfile.update({ where: { id: m.id }, data: { capabilities: merged } });
      console.log('Updated', m.modelId, '->', JSON.stringify(merged));
    } else {
      console.log('Skip  ', m.modelId);
    }
  }
  console.log('Done');
}
main().catch(console.error).finally(() => prisma.$disconnect());
