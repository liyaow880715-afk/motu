import type { ProductAnalysisOutput } from "@/lib/ai/schemas/product-analysis";
import { buildAdLawPromptSection } from "@/lib/ai/ad-law-guard";
import {
  platformLabels,
  sectionTypeLabels,
  styleLabels,
  type PlatformOption,
  type StyleOption,
} from "@/types/domain";
import { contentLanguageNamesForPrompt, normalizeContentLanguage, type ContentLanguage } from "@/lib/utils/content-language";

const sectionTypeGuide = Object.entries(sectionTypeLabels)
  .map(([key, label]) => `${key}=${label}`)
  .join(", ");

function buildPlanningContext(analysis: ProductAnalysisOutput) {
  return {
    productName: analysis.productName,
    category: analysis.category,
    subcategory: analysis.subcategory,
    styleTags: analysis.styleTags.slice(0, 6),
    targetAudience: analysis.targetAudience.slice(0, 4),
    usageScenarios: analysis.usageScenarios.slice(0, 4),
    coreSellingPoints: analysis.coreSellingPoints.slice(0, 6),
    differentiationPoints: analysis.differentiationPoints.slice(0, 4),
    suggestedSectionPlan: analysis.suggestedSectionPlan.slice(0, 6),
    nutritionFacts: analysis.nutritionFacts ?? {},
  };
}

export function buildSectionPlanningPrompt(
  analysis: ProductAnalysisOutput,
  style: string,
  platform: string,
  detailSectionCount = 6,
  heroImageCount = 4,
  contentLanguage: ContentLanguage = "zh-CN",
) {
  const styleLabel = styleLabels[style as StyleOption] ?? style;
  const platformLabel = platformLabels[platform as PlatformOption] ?? platform;
  const targetLanguage = contentLanguageNamesForPrompt[normalizeContentLanguage(contentLanguage)];
  const totalSections = heroImageCount + detailSectionCount;

  const planningContext = buildPlanningContext(analysis);

  const adLawSection = buildAdLawPromptSection(
    analysis.adLawCategory || analysis.category,
    analysis.subcategory,
  );

  return [
    "You are a senior e-commerce detail-page strategist.",
    `Platform: ${platformLabel} | Style: ${styleLabel} | Language: ${targetLanguage}`,
    `Generate ${totalSections} sections total: ${heroImageCount} hero images + ${detailSectionCount} detail sections.`,
    "Return strict JSON only. No markdown.",
    "",
    "## Output format:",
    '{"sections": [{"id":"...","type":"...","title":"...","goal":"...","copy":"...","visualPrompt":"..."}]}',
    "",
    "## Section types:",
    "hero, pain_point, selling_points, scenario, detail_closeup, specs, material, comparison, brand_trust, summary, conversion, gift_scene, origin, nutrition, audience, formula, custom",
    "",
    "## Each section fields (keep concise):",
    "- id: unique string",
    "- type: section type",
    "- title: Chinese section name",
    "- goal: 1-sentence design purpose",
    "- copy: marketing copy (main title + key bullets, Chinese)",
    "- visualPrompt: bilingual prompt with Chinese visual direction + English Prompt (30-50 words, photography terms, vertical 9:16 mobile composition)",
    "",
    "## Rules:",
    "- First " + heroImageCount + " sections must be type=hero",
    "- Remaining " + detailSectionCount + " sections are detail sections",
    "- All copy in Simplified Chinese",
    "- visualPrompt format: '中文提示：... English Prompt: ...'",
    "- Keep visualPrompt under 100 words total",
    "- Visual flow: Grab → Empathize → Trust → Convert",
    "- ALL marketing copy (title, bullets, headlines) must comply with Chinese Advertising Law: no absolute superlatives (最, 第一, 顶级, 最佳, 唯一, 根治, 治愈, 100%, etc.), no false medical claims, no unverified certifications.",
    "- If nutritionFacts data is provided in the context, use those exact values in the copy for specs/nutrition sections. Do not estimate, round, or invent numbers. If data is missing, omit specific numbers rather than guessing.",
    adLawSection,
    "",
    "## Context:",
    JSON.stringify(planningContext),
  ].join("\n");
}

export function buildClothingPlanningPrompt(
  analysis: ProductAnalysisOutput,
  style: string,
  platform: string,
  heroImageCount = 4,
  contentLanguage: ContentLanguage = "zh-CN",
) {
  const styleLabel = styleLabels[style as StyleOption] ?? style;
  const platformLabel = platformLabels[platform as PlatformOption] ?? platform;
  const targetLanguage = contentLanguageNamesForPrompt[normalizeContentLanguage(contentLanguage)];
  const totalSections = heroImageCount + 10;

  const planningContext = buildPlanningContext(analysis);

  const adLawSection = buildAdLawPromptSection(
    analysis.adLawCategory || analysis.category,
    analysis.subcategory,
  );

  const fixedModules = [
    { type: "scenario", title: "模特全身展示", desc: "模特站立全身照，展示整体穿搭效果" },
    { type: "selling_points", title: "产品正反面展示", desc: "服装正面与背面平铺/挂拍展示" },
    { type: "detail_closeup", title: "设计细节展示", desc: "领口、袖口、纽扣、缝线等工艺特写" },
    { type: "material", title: "材质展示", desc: "面料纹理、光泽、触感等材质特写" },
    { type: "specs", title: "尺码表", desc: "尺码对照表与测量方法示意" },
    { type: "scenario", title: "模特正面展示", desc: "模特正面半身/全身照" },
    { type: "scenario", title: "模特背面展示", desc: "模特背面展示照" },
    { type: "scenario", title: "模特侧身展示", desc: "模特侧身展示照，突出版型线条" },
    { type: "detail_closeup", title: "产品正面大图", desc: "服装正面高清全貌图" },
    { type: "detail_closeup", title: "产品背面大图", desc: "服装背面高清全貌图" },
    { type: "detail_closeup", title: "产品细节大图", desc: "关键细节部位高清大图" },
  ];

  return [
    "You are a senior e-commerce fashion detail-page strategist specializing in clothing products.",
    `Platform: ${platformLabel} | Style: ${styleLabel} | Language: ${targetLanguage}`,
    `Generate ${totalSections} sections total: ${heroImageCount} hero images + 10 fixed clothing detail sections.`,
    "Return strict JSON only. No markdown.",
    "",
    "## CRITICAL: Fixed module structure (MUST follow exactly)",
    "The output MUST contain exactly these sections in this order:",
    "",
    ...fixedModules.map((m, i) => `${i + 1}. type=${m.type} | title must include '${m.title}' | purpose: ${m.desc}`),
    "",
    `Before these 10 detail modules, there must be exactly ${heroImageCount} hero sections (type=hero).`,
    "",
    "## Output format:",
    '{"sections": [{"id":"...","type":"...","title":"...","goal":"...","copy":"...","visualPrompt":"..."}]}',
    "",
    "## Each section fields (be specific and product-relevant):",
    "- id: unique string",
    "- type: one of the fixed types above (DO NOT deviate)",
    "- title: Chinese section name. MUST incorporate the product name, style, color, or fabric. Generic titles like '模特全身展示' are forbidden — make it specific, e.g. '法式碎花连衣裙·模特全身展示' or '复古牛仔外套·模特正面展示'.",
    "- goal: 1-sentence design purpose that references the specific product's selling point",
    "- copy: marketing copy (main title + 2-3 key bullets) in Simplified Chinese. MUST reference actual product features from context — color, fabric, cut, style, occasion. Do NOT use generic filler text like '优质面料，亲肤透气'.",
    "- visualPrompt: bilingual prompt with specific product details injected. Format: '中文提示：... English Prompt: ...'",
    "",
    "## visualPrompt rules for clothing:",
    "- HERO sections (头图): MUST use '正方形 1:1 构图' / 'square 1:1 composition' — these are hero/main images, NOT detail images.",
    "- DETAIL sections (the 10 fixed modules): MUST use '竖版 3:4 构图' / 'vertical 3:4 mobile composition'.",
    "- For ANY detail section that shows a model (全身/正面/背面/侧身), the prompt MUST end with: '请严格保持与参考图中模特一致的人物形象、发型、五官和身材比例。' / 'Strictly maintain the same model appearance, hairstyle, facial features, and body proportions as the reference image.'",
    "- Include specific product descriptors from context: color, fabric type, silhouette, pattern, neckline, sleeve length, hem style",
    "- Keep visualPrompt under 120 words total",
    "",
    "## Copy rules:",
    "- ALL marketing copy must comply with Chinese Advertising Law: no absolute superlatives (最, 第一, 顶级, 最佳, 唯一, 根治, 治愈, 100%, etc.)",
    "- Copy must be SPECIFIC to this product. Mention actual colors, fabrics, design features, target occasions.",
    "- Avoid generic phrases like '优质面料' or '精工细作' unless paired with specific material names.",
    adLawSection,
    "",
    "## Context:",
    JSON.stringify(planningContext),
  ].join("\n");
}
