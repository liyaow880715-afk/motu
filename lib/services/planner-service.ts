import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { z } from "zod";

import { buildSectionPlanningPrompt, buildClothingPlanningPrompt } from "@/lib/ai/prompts";
import { sectionPlanOutputSchema } from "@/lib/ai/schemas/section-plan";
import { prisma } from "@/lib/db/prisma";
import { getProviderAdapter } from "@/lib/services/provider-service";
import { completeTask, createTask, failTask, findRecentRunningTask } from "@/lib/services/task-service";
import { normalizeContentLanguage, type ContentLanguage } from "@/lib/utils/content-language";
import type { SectionTypeKey } from "@/types/domain";

type PreviewConfigInput = {
  heroImageCount: number;
  detailSectionCount: number;
  imageAspectRatio: "3:4" | "9:16";
  contentLanguage: ContentLanguage;
};

type RawPlannedSection = {
  id: string;
  type: string;
  title: string;
  goal: string;
  copy: string;
  visualPrompt: string;
  editableFields: Record<string, unknown>;
};

type NormalizedSection = {
  sectionKey: string;
  type: string;
  title: string;
  goal: string;
  copy: string;
  visualPrompt: string;
  editableData: Record<string, unknown>;
  order: number;
};

const previewConfigSchema = z.object({
  heroImageCount: z.number().int().min(3).max(5),
  detailSectionCount: z.number().int().min(4).max(15),
  imageAspectRatio: z.enum(["3:4", "9:16"]).default("9:16"),
  contentLanguage: z.enum(["zh-CN", "en-US", "ja-JP", "ko-KR"]).default("zh-CN"),
});

const previewDecisionSchema = z.object({
  heroImageCount: z.number().int().min(3).max(5),
  detailSectionCount: z.number().int().min(4).max(10),
  reason: z.string().default(""),
});

const heroFallbackSections: Array<{
  id: string;
  type: SectionTypeKey;
  title: string;
  goal: string;
  copy: string;
  visualPrompt: string;
  editableFields: Record<string, unknown>;
}> = [
  {
    id: "hero_01",
    type: "hero",
    title: "第一屏主视觉",
    goal: "快速建立商品记忆点，突出第一眼吸引力。",
    copy: "用一张完成度很高的主视觉图，把商品核心价值和气质一次讲清楚。",
    visualPrompt:
      "中文提示：电商头图主视觉，商品主体居中，画面高级干净，加入精炼中文标题与品牌感文案，适合 1:1 头图轮播。\nEnglish Prompt: Premium e-commerce hero visual with centered product, clean lighting, strong branding copy built into the image, ideal for a square gallery cover.",
    editableFields: {
      tone: "高级质感",
      compositionHint: "居中构图",
    },
  },
  {
    id: "hero_02",
    type: "hero",
    title: "核心卖点头图",
    goal: "用一张强转化头图把最值得买的理由直接讲透。",
    copy: "把商品最强卖点直接做进画面标题和图内短句里，让用户第一时间知道为什么值得买。",
    visualPrompt:
      "中文提示：电商头图，突出核心卖点信息，商品主体清晰，图内直接排版中文标题、短卖点和轻行动号召，适合 1:1 头图轮播。\nEnglish Prompt: Square e-commerce hero image focused on the strongest selling point, with Chinese headline, short selling copy, and a subtle CTA integrated directly inside the image.",
    editableFields: {
      tone: "转化导向",
      compositionHint: "主体 + 卖点文案同屏",
    },
  },
  {
    id: "hero_03",
    type: "hero",
    title: "场景氛围头图",
    goal: "让用户快速代入使用场景和生活方式气质。",
    copy: "通过场景化构图和图内标题文案，让商品与生活方式、使用时刻建立直接关联。",
    visualPrompt:
      "中文提示：电商头图，场景化生活方式氛围，商品依然是主角，图内直接排版中文场景标题与情绪化价值文案，适合 1:1 头图轮播。\nEnglish Prompt: Square e-commerce hero image with a strong lifestyle scene, keeping the product as the focal point and integrating Chinese scene-driven headline and emotional value copy into the image.",
    editableFields: {
      tone: "氛围感",
      compositionHint: "场景化构图",
    },
  },
  {
    id: "hero_04",
    type: "hero",
    title: "细节信任头图",
    goal: "用品质、工艺或材质细节建立第一屏信任感。",
    copy: "通过近景细节和简洁文案，让用户第一眼感知品质感、工艺感和完成度。",
    visualPrompt:
      "中文提示：电商头图，强调品质细节、材质或工艺，画面高级克制，图内直接排版中文品质标题和信任感短句，适合 1:1 头图轮播。\nEnglish Prompt: Square e-commerce hero image focused on craftsmanship and material trust, with elegant composition and Chinese quality-driven copy integrated into the image.",
    editableFields: {
      tone: "品质背书",
      compositionHint: "细节近景",
    },
  },
  {
    id: "hero_05",
    type: "hero",
    title: "差异化亮点头图",
    goal: "突出相对竞品或常规选择的差异化优势。",
    copy: "围绕核心差异化特点，用更直接的对比式表达完成最后一张头图收口。",
    visualPrompt:
      "中文提示：电商头图，突出差异化优势和购买理由，图内直接排版中文对比式标题、优势短句和行动号召，适合 1:1 头图轮播。\nEnglish Prompt: Square e-commerce hero image emphasizing differentiation and buying reasons, with Chinese comparison-style headline, advantage copy, and CTA built directly into the image.",
    editableFields: {
      tone: "差异化强调",
      compositionHint: "对比式信息布局",
    },
  },
];

const detailFallbackSections: Array<{
  id: string;
  type: SectionTypeKey;
  title: string;
  goal: string;
  copy: string;
  visualPrompt: string;
  editableFields: Record<string, unknown>;
}> = [
  {
    id: "selling_points_01",
    type: "selling_points",
    title: "核心卖点速览",
    goal: "让用户快速理解最值得购买的理由。",
    copy: "用图内标题、卖点短句和对比式信息，把购买理由在一屏内讲清楚。",
    visualPrompt:
      "中文提示：电商卖点模块，商品清晰展示，图内直接排版中文卖点标题、短句与功能标签，整体干净有转化感。\nEnglish Prompt: Conversion-focused selling-points section with the product clearly shown and Chinese selling-point copy designed directly inside the image.",
    editableFields: {
      sellingPoints: [],
      tone: "转化导向",
      compositionHint: "卖点信息分区排版",
    },
  },
  {
    id: "detail_closeup_01",
    type: "detail_closeup",
    title: "细节特写",
    goal: "强化材质、工艺与真实质感。",
    copy: "通过近景放大，把材质、边缘和工艺细节讲透。",
    visualPrompt:
      "中文提示：电商细节特写图，突出纹理、边缘、表面光泽与做工，并在图内加入中文短标题和工艺说明。\nEnglish Prompt: Detailed close-up e-commerce image highlighting texture, finish, edges, and craftsmanship, with concise Chinese copy integrated into the composition.",
    editableFields: {
      tone: "细节说明",
      compositionHint: "近景微距",
    },
  },
  {
    id: "scenario_01",
    type: "scenario",
    title: "场景使用展示",
    goal: "让用户更容易代入真实使用场景。",
    copy: "把商品放进真实场景里，提升想象空间和购买欲望。",
    visualPrompt:
      "中文提示：生活方式场景图，商品仍为主角，图内直接排版中文场景标题和使用价值文案，整体自然有氛围。\nEnglish Prompt: Lifestyle usage scene with the product as the focal point, featuring integrated Chinese copy about the usage scenario and emotional value.",
    editableFields: {
      tone: "生活方式",
      compositionHint: "场景化展示",
    },
  },
  {
    id: "specs_01",
    type: "specs",
    title: "规格信息说明",
    goal: "把参数、尺寸和适配信息讲清楚。",
    copy: "通过结构化图文版式，让规格信息一眼看懂。",
    visualPrompt:
      "中文提示：规格参数型详情图，商品搭配尺寸线、参数表和中文说明排版，信息清晰整洁，适合移动端浏览。\nEnglish Prompt: Specification-focused detail image combining the product with dimensions, parameter layout, and Chinese explanatory copy designed directly in-image.",
    editableFields: {
      tone: "专业说明",
      compositionHint: "参数表格式",
    },
  },
  {
    id: "material_01",
    type: "material",
    title: "材质工艺说明",
    goal: "补充专业感与品质背书。",
    copy: "把用户不容易从外观看懂的材质和工艺价值解释清楚。",
    visualPrompt:
      "中文提示：材质工艺详情图，突出材质纹理、工艺结构和品质细节，图内加入中文短标题和价值说明。\nEnglish Prompt: Material and craftsmanship detail image that emphasizes texture and premium construction, with Chinese value statements integrated into the image.",
    editableFields: {
      tone: "专业背书",
      compositionHint: "结构与纹理并重",
    },
  },
  {
    id: "comparison_01",
    type: "comparison",
    title: "差异化对比",
    goal: "清楚说明为什么值得选这款商品。",
    copy: "用优势对比和价值提炼，帮助用户更快完成决策。",
    visualPrompt:
      "中文提示：对比说明型详情图，突出本品优势、差异点和购买理由，图内直接设计中文标题和对比信息模块。\nEnglish Prompt: Comparison-style detail page image emphasizing advantages, differentiation, and buying reasons, with Chinese comparison copy embedded inside the image.",
    editableFields: {
      tone: "价值对比",
      compositionHint: "左右或上下对比版式",
    },
  },
  {
    id: "brand_trust_01",
    type: "brand_trust",
    title: "品牌与信任背书",
    goal: "提升品牌感和成交信任感。",
    copy: "通过品牌理念、工艺标准或服务承诺，增加下单安心感。",
    visualPrompt:
      "中文提示：品牌背书型详情图，图内加入品牌理念、工艺标准或服务承诺等中文信息，整体克制专业。\nEnglish Prompt: Brand trust section image with Chinese copy about brand values, quality assurance, or service promise built directly into the image.",
    editableFields: {
      tone: "信任建立",
      compositionHint: "品牌叙事排版",
    },
  },
  {
    id: "summary_01",
    type: "summary",
    title: "购买理由总结",
    goal: "形成最后一轮转化推动。",
    copy: "通过总结式收口，帮助用户更快完成购买决策。",
    visualPrompt:
      "中文提示：总结收口型详情图，商品主体清晰，图内直接放入中文总结标题、购买理由和行动号召。\nEnglish Prompt: Conversion-closing summary image with strong product focus and Chinese summary copy plus CTA integrated directly into the visual.",
    editableFields: {
      tone: "收口转化",
      compositionHint: "稳定收束",
    },
  },
];

function isClothingCategory(category: string, subcategory: string): boolean {
  const text = `${category} ${subcategory}`.toLowerCase();
  const keywords = [
    "服装", "服饰", "衣服", "女装", "男装", "童装",
    "上衣", "t恤", "衬衫", "裤子", "裙", "外套", "夹克",
    "大衣", "风衣", "西装", "卫衣", "毛衣", "针织衫", "牛仔",
    "汉服", "旗袍", "内衣", "睡衣", "运动服", "泳装", "打底",
    "背心", "马甲", "工装", "休闲", "正装", "时装", "连衣",
    "半裙", "长裤", "短裤", "半身裙", "吊带", "抹胸", " Polo",
  ];
  return keywords.some((kw) => text.includes(kw));
}

function buildClothingFixedPlan(heroImageCount: number): NormalizedSection[] {
  const heroes: NormalizedSection[] = [];
  for (let i = 0; i < heroImageCount; i++) {
    const template = heroFallbackSections[i % heroFallbackSections.length];
    heroes.push({
      sectionKey: `hero_${String(i + 1).padStart(2, "0")}`,
      type: "HERO",
      title: template.title,
      goal: template.goal,
      copy: template.copy,
      visualPrompt: template.visualPrompt,
      editableData: {
        ...template.editableFields,
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
      order: i,
    });
  }

  const clothingDetails: Array<Omit<NormalizedSection, "sectionKey" | "order">> = [
    {
      type: "SCENARIO",
      title: "模特全身展示",
      goal: "展示服装上身效果，帮助用户建立穿着想象。",
      copy: "模特上身实拍，展示整体版型与搭配效果，直观呈现穿着气质。",
      visualPrompt:
        "中文提示：专业电商服装模特全身展示图，模特站立姿势自然，服装版型清晰可见，背景简洁干净，突出服装整体上身效果与搭配风格。请严格保持与参考图中模特一致的人物形象、发型、五官和身材比例。竖版 3:4 构图。\nEnglish Prompt: Full-body fashion model shot for e-commerce, natural standing pose, clear silhouette of the garment, clean minimal background. Strictly maintain the same model appearance, hairstyle, facial features, and body proportions as the reference image. Vertical 3:4 mobile composition.",
      editableData: {
        tone: "专业展示",
        compositionHint: "全身站姿",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "SELLING_POINTS",
      title: "产品正反面展示",
      goal: "完整展示服装正反面设计，让用户全面了解产品外观。",
      copy: "正面与背面设计一目了然，完整呈现服装剪裁、版型与设计细节。",
      visualPrompt:
        "中文提示：电商服装产品平铺展示图，正反面并排排列，面料纹理清晰可见，背景为纯色或浅色，突出服装剪裁与版型设计，竖版 3:4 构图。\nEnglish Prompt: Flat-lay clothing product display showing front and back side by side, fabric texture visible, solid light background, highlighting cut and silhouette, vertical 3:4 mobile composition.",
      editableData: {
        tone: "产品展示",
        compositionHint: "正反面平铺并排",
        sellingPoints: [],
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "DETAIL_CLOSEUP",
      title: "设计细节展示",
      goal: "突出服装工艺细节，建立品质信任感。",
      copy: "领口、袖口、纽扣、缝线等细节精工细作，彰显品质与匠心。",
      visualPrompt:
        "中文提示：服装工艺细节特写图，聚焦领口、袖口、纽扣、缝线等特色设计，微距视角展现面料质感与做工细节，背景虚化简洁，竖版 3:4 构图。\nEnglish Prompt: Close-up detail shots of clothing craftsmanship, focusing on collar, cuffs, buttons, and stitching, macro perspective showing fabric texture and workmanship, clean blurred background, vertical 3:4 composition.",
      editableData: {
        tone: "品质细节",
        compositionHint: "微距特写",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "MATERIAL",
      title: "材质展示",
      goal: "展示面料质感与成分，增强购买信心。",
      copy: "优质面料，亲肤透气，触感细腻，穿着舒适安心。",
      visualPrompt:
        "中文提示：服装面料材质展示图，突出面料纹理、光泽与柔软质感，可搭配面料成分标签，背景干净简洁，竖版 3:4 构图。\nEnglish Prompt: Fabric material showcase for clothing, highlighting texture, sheen and tactile quality, with optional fabric composition label, clean background, vertical 3:4 mobile composition.",
      editableData: {
        tone: "材质说明",
        compositionHint: "面料纹理特写",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "SPECS",
      title: "尺码表",
      goal: "提供准确尺码信息，降低退换率。",
      copy: "详细尺码对照表，肩宽、胸围、衣长、袖长一目了然，选购更安心。",
      visualPrompt:
        "中文提示：电商服装尺码信息图，包含尺码对照表与测量示意图，模特尺码参考，排版清晰专业，竖版 3:4 构图。\nEnglish Prompt: Clothing size chart e-commerce graphic with measurement diagram and size reference, clear professional typography, vertical 3:4 mobile composition.",
      editableData: {
        tone: "专业说明",
        compositionHint: "信息表格排版",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "SCENARIO",
      title: "模特正面展示",
      goal: "展示服装正面穿着效果，突出正面版型与设计。",
      copy: "模特正面实拍，清晰呈现服装正面剪裁、版型与上身效果。",
      visualPrompt:
        "中文提示：电商服装模特正面展示图，模特正面站立姿势自然，服装正面版型与设计细节清晰可见，背景简洁干净，突出服装正面效果。请严格保持与参考图中模特一致的人物形象、发型、五官和身材比例。竖版 3:4 构图。\nEnglish Prompt: Front-view fashion model shot for e-commerce, natural frontal standing pose, clear view of the garment's front silhouette and design details, clean minimal background. Strictly maintain the same model appearance, hairstyle, facial features, and body proportions as the reference image. Vertical 3:4 mobile composition.",
      editableData: {
        tone: "正面展示",
        compositionHint: "正面站姿",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "SCENARIO",
      title: "模特背面展示",
      goal: "展示服装背面穿着效果，突出背面版型与设计。",
      copy: "模特背面实拍，清晰呈现服装背面剪裁、版型与上身效果。",
      visualPrompt:
        "中文提示：电商服装模特背面展示图，模特背面站立姿势自然，服装背面版型与设计细节清晰可见，背景简洁干净，突出服装背面效果。请严格保持与参考图中模特一致的人物形象、发型、五官和身材比例。竖版 3:4 构图。\nEnglish Prompt: Back-view fashion model shot for e-commerce, natural back-facing standing pose, clear view of the garment's back silhouette and design details, clean minimal background. Strictly maintain the same model appearance, hairstyle, facial features, and body proportions as the reference image. Vertical 3:4 mobile composition.",
      editableData: {
        tone: "背面展示",
        compositionHint: "背面站姿",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "SCENARIO",
      title: "模特侧身展示",
      goal: "展示服装侧身穿着效果，突出侧面版型与线条。",
      copy: "模特侧身实拍，清晰呈现服装侧面剪裁、版型与线条感。",
      visualPrompt:
        "中文提示：电商服装模特侧身展示图，模特侧身站立姿势自然，服装侧身版型与线条细节清晰可见，背景简洁干净，突出服装侧身效果。请严格保持与参考图中模特一致的人物形象、发型、五官和身材比例。竖版 3:4 构图。\nEnglish Prompt: Side-view fashion model shot for e-commerce, natural side-facing standing pose, clear view of the garment's side silhouette and line details, clean minimal background. Strictly maintain the same model appearance, hairstyle, facial features, and body proportions as the reference image. Vertical 3:4 mobile composition.",
      editableData: {
        tone: "侧身展示",
        compositionHint: "侧身站姿",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "DETAIL_CLOSEUP",
      title: "产品正面大图",
      goal: "高清展示服装正面全貌，建立产品信任。",
      copy: "高清大图呈现服装正面全貌，细节清晰可见，所见即所得。",
      visualPrompt:
        "中文提示：电商服装产品正面高清大图，服装正面全貌完整呈现，面料纹理与剪裁细节清晰，纯色背景突出产品本身，竖版 3:4 构图。\nEnglish Prompt: High-resolution front-view clothing product shot, complete front silhouette with clear fabric texture and cut details, solid color background emphasizing the product, vertical 3:4 mobile composition.",
      editableData: {
        tone: "高清展示",
        compositionHint: "正面全貌",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "DETAIL_CLOSEUP",
      title: "产品背面大图",
      goal: "高清展示服装背面全貌，完善产品信息。",
      copy: "高清大图呈现服装背面全貌，背面设计与细节清晰可见。",
      visualPrompt:
        "中文提示：电商服装产品背面高清大图，服装背面全貌完整呈现，背面设计与面料细节清晰，纯色背景突出产品本身，竖版 3:4 构图。\nEnglish Prompt: High-resolution back-view clothing product shot, complete back silhouette with clear back design and fabric details, solid color background emphasizing the product, vertical 3:4 mobile composition.",
      editableData: {
        tone: "高清展示",
        compositionHint: "背面全貌",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
    {
      type: "DETAIL_CLOSEUP",
      title: "产品细节大图",
      goal: "高清展示服装关键细节，增强品质信任。",
      copy: "高清大图聚焦服装关键细节，工艺与材质一目了然。",
      visualPrompt:
        "中文提示：电商服装产品细节高清大图，聚焦关键细节如缝线、面料纹理、标签等，微距视角展现品质，纯色背景简洁干净，竖版 3:4 构图。\nEnglish Prompt: High-resolution clothing product detail shot, focusing on key details like stitching, fabric texture, and labels, macro perspective showcasing quality, solid color background, vertical 3:4 mobile composition.",
      editableData: {
        tone: "高清展示",
        compositionHint: "细节特写",
        mainTitle: "",
        subTitle: "",
        layout: "",
        visualDescription: "",
        negativePrompt: "",
        colorScheme: null,
        whitespaceRatio: 35,
      },
    },
  ];

  const details = clothingDetails.map((d, i) => ({
    ...d,
    sectionKey: `detail_${String(i + 1).padStart(2, "0")}_${d.type.toLowerCase()}`,
    order: heroes.length + i,
  }));

  return [...heroes, ...details];
}

function postProcessClothingVisualPrompt(prompt: string, moduleTitle: string): string {
  let result = prompt.trim();
  if (!result) return result;

  // Ensure 3:4 aspect ratio
  if (!result.includes("3:4") && !result.includes("3：4")) {
    result = result.replace(
      /(English Prompt:[\s\S]*?)(\s*$)/i,
      "$1 Vertical 3:4 mobile composition.$2",
    );
    result = result.replace(
      /(中文提示：[\s\S]*?)(\s*English Prompt:)/i,
      "$1 竖版 3:4 构图。$2",
    );
    if (!result.includes("3:4") && !result.includes("3：4")) {
      result += "\n中文提示：竖版 3:4 构图。\nEnglish Prompt: Vertical 3:4 mobile composition.";
    }
  }

  // Ensure model consistency for model-related modules
  const modelRelatedKeywords = ["模特全身", "模特正面", "模特背面", "模特侧身"];
  const isModelRelated = modelRelatedKeywords.some((kw) => moduleTitle.includes(kw));
  if (isModelRelated) {
    const consistencyCn = "请严格保持与参考图中模特一致的人物形象、发型、五官和身材比例。";
    const consistencyEn = "Strictly maintain the same model appearance, hairstyle, facial features, and body proportions as the reference image.";
    if (!result.includes(consistencyCn)) {
      result = result.replace(
        /(中文提示：[\s\S]*?)(\s*English Prompt:)/i,
        `$1${consistencyCn}$2`,
      );
    }
    if (!result.includes(consistencyEn)) {
      result = result.replace(
        /(English Prompt:[\s\S]*?)(\s*$)/i,
        `$1 ${consistencyEn}$2`,
      );
    }
  }

  return result;
}

function buildClothingSections(
  rawSections: RawPlannedSection[],
  heroImageCount: number,
): NormalizedSection[] {
  const clothingModuleTypes = [
    "SCENARIO",       // 模特全身展示
    "SELLING_POINTS", // 产品正反面展示
    "DETAIL_CLOSEUP", // 设计细节展示
    "MATERIAL",       // 材质展示
    "SPECS",          // 尺码表
    "SCENARIO",       // 模特正面展示
    "SCENARIO",       // 模特背面展示
    "SCENARIO",       // 模特侧身展示
    "DETAIL_CLOSEUP", // 产品正面大图
    "DETAIL_CLOSEUP", // 产品背面大图
    "DETAIL_CLOSEUP", // 产品细节大图
  ];

  const clothingModuleTitles = [
    "模特全身展示",
    "产品正反面展示",
    "设计细节展示",
    "材质展示",
    "尺码表",
    "模特正面展示",
    "模特背面展示",
    "模特侧身展示",
    "产品正面大图",
    "产品背面大图",
    "产品细节大图",
  ];

  // Normalize AI-returned sections
  const normalized = rawSections.map((section) => {
    const editableFields = normalizeEditableFields(section.editableFields);
    return {
      type: normalizeSectionType(section.type),
      title: section.title || "",
      goal: section.goal || "",
      copy: section.copy || "",
      visualPrompt: ensureBilingualPrompt(section.visualPrompt || "", section.title || ""),
      editableData: {
        ...editableFields,
        mainTitle: (section as any).mainTitle || "",
        subTitle: (section as any).subTitle || "",
        layout: (section as any).layout || "",
        visualDescription: (section as any).visualDescription || "",
        negativePrompt: (section as any).negativePrompt || "",
        colorScheme: (section as any).colorScheme || null,
        whitespaceRatio: (section as any).whitespaceRatio || 35,
      },
    };
  });

  const heroPool = normalized.filter((s) => s.type === "HERO");
  const detailPool = normalized.filter((s) => s.type !== "HERO");

  // Build heroes
  const finalHeroes: NormalizedSection[] = [];
  for (let i = 0; i < heroImageCount; i++) {
    const aiHero = heroPool[i];
    if (aiHero) {
      // Force hero visualPrompt to 1:1 (AI may incorrectly put 3:4)
      let heroPrompt = aiHero.visualPrompt;
      if (heroPrompt) {
        heroPrompt = heroPrompt
          .replace(/竖版\s*3:4\s*构图/g, "正方形 1:1 构图")
          .replace(/vertical\s*3:4\s*mobile\s*composition/gi, "square 1:1 composition")
          .replace(/3:4/g, "1:1")
          .replace(/3：4/g, "1：1");
      }
      finalHeroes.push({
        ...aiHero,
        visualPrompt: heroPrompt,
        sectionKey: `hero_${String(i + 1).padStart(2, "0")}`,
        order: i,
      });
    } else {
      const fallback = heroFallbackSections[i % heroFallbackSections.length];
      finalHeroes.push({
        sectionKey: `hero_${String(i + 1).padStart(2, "0")}`,
        type: "HERO",
        title: fallback.title,
        goal: fallback.goal,
        copy: fallback.copy,
        visualPrompt: fallback.visualPrompt,
        editableData: {
          ...fallback.editableFields,
          mainTitle: "",
          subTitle: "",
          layout: "",
          visualDescription: "",
          negativePrompt: "",
          colorScheme: null,
          whitespaceRatio: 35,
        },
        order: i,
      });
    }
  }

  // Build fixed-structure detail modules with AI-generated content
  const finalDetails: NormalizedSection[] = [];
  for (let i = 0; i < clothingModuleTypes.length; i++) {
    const fixedType = clothingModuleTypes[i];
    const fixedTitle = clothingModuleTitles[i];
    const aiDetail = detailPool[i];

    let title = fixedTitle;
    let goal = "";
    let copy = "";
    let visualPrompt = "";
    let editableData: Record<string, unknown> = {
      mainTitle: "",
      subTitle: "",
      layout: "",
      visualDescription: "",
      negativePrompt: "",
      colorScheme: null,
      whitespaceRatio: 35,
    };

    if (aiDetail) {
      title = aiDetail.title.includes(fixedTitle) ? aiDetail.title : `${fixedTitle} · ${aiDetail.title}`;
      if (!aiDetail.title || aiDetail.title.trim() === "") title = fixedTitle;
      goal = aiDetail.goal;
      copy = aiDetail.copy;
      visualPrompt = aiDetail.visualPrompt;
      editableData = aiDetail.editableData;
    }

    visualPrompt = postProcessClothingVisualPrompt(visualPrompt, fixedTitle);

    finalDetails.push({
      sectionKey: `detail_${String(i + 1).padStart(2, "0")}_${fixedType.toLowerCase()}`,
      type: fixedType,
      title,
      goal,
      copy,
      visualPrompt,
      editableData,
      order: finalHeroes.length + i,
    });
  }

  return [...finalHeroes, ...finalDetails];
}

const sectionTypeMap: Record<string, string> = {
  hero: "HERO",
  pain_point: "SCENARIO",
  selling_points: "SELLING_POINTS",
  scenario: "SCENARIO",
  detail_closeup: "DETAIL_CLOSEUP",
  specs: "SPECS",
  material: "MATERIAL",
  comparison: "COMPARISON",
  gift_scene: "GIFT_SCENE",
  brand_trust: "BRAND_TRUST",
  summary: "SUMMARY",
  formula: "SELLING_POINTS",
  origin: "MATERIAL",
  nutrition: "SPECS",
  audience: "BRAND_TRUST",
  conversion: "SUMMARY",
  custom: "CUSTOM",
};

function normalizeSectionType(type: string) {
  const normalized = type.trim().toLowerCase();
  return sectionTypeMap[normalized] ?? "CUSTOM";
}

function ensureBilingualPrompt(prompt: string, sectionTitle: string) {
  const trimmed = prompt.trim();
  if (
    trimmed.includes("English Prompt:") &&
    (trimmed.includes("中文提示：") || trimmed.includes("Primary Prompt:"))
  ) {
    return trimmed;
  }

  const primaryPrompt =
    trimmed || `${sectionTitle}，突出商品主体、商业排版和图内卖点信息，适合移动端电商详情页。`;
  return `Primary Prompt: ${primaryPrompt}\nEnglish Prompt: A premium e-commerce section visual for ${sectionTitle}, with the marketing copy designed directly inside the image and a strong conversion-focused composition.`;
}

function normalizeEditableFields(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readPreviewConfig(snapshot: unknown): PreviewConfigInput {
  const raw = ((snapshot as Record<string, unknown> | null) ?? {}).previewConfig;
  return previewConfigSchema.parse({
    heroImageCount: Number((raw as Record<string, unknown> | null)?.heroImageCount ?? 4),
    detailSectionCount: Number((raw as Record<string, unknown> | null)?.detailSectionCount ?? 6),
    imageAspectRatio: ((raw as Record<string, unknown> | null)?.imageAspectRatio ?? "9:16") as "3:4" | "9:16",
    contentLanguage: normalizeContentLanguage((raw as Record<string, unknown> | null)?.contentLanguage),
  });
}

function readPreviewMeta(snapshot: unknown) {
  const raw = ((snapshot as Record<string, unknown> | null) ?? {}).previewConfig as Record<string, unknown> | null;
  return {
    imageAspectRatio: raw?.imageAspectRatio === "3:4" ? "3:4" : "9:16",
    contentLanguage: normalizeContentLanguage(raw?.contentLanguage),
  } as const;
}

async function normalizeProjectSections(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  let heroCursor = 0;
  let detailCursor = 0;

  await prisma.$transaction(
    project.sections.map((section, index) => {
      const isHero = section.type === "HERO";
      if (isHero) {
        heroCursor += 1;
      } else {
        detailCursor += 1;
      }

      return prisma.pageSection.update({
        where: { id: section.id },
        data: {
          order: index,
          sectionKey: isHero
            ? `hero_${String(heroCursor).padStart(2, "0")}`
            : `detail_${String(detailCursor).padStart(2, "0")}_${section.type.toLowerCase()}`,
        },
      });
    }),
  );

  const currentSnapshot = (project.modelSnapshot as Record<string, unknown> | null) ?? {};
  const currentPreviewMeta = readPreviewMeta(project.modelSnapshot);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      modelSnapshot: {
        ...currentSnapshot,
        previewConfig: {
          ...(currentSnapshot.previewConfig as Record<string, unknown> | null),
          heroImageCount: heroCursor,
          detailSectionCount: detailCursor,
          imageAspectRatio: currentPreviewMeta.imageAspectRatio,
          contentLanguage: currentPreviewMeta.contentLanguage,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

async function assertSectionMutationAllowed(projectId: string, options: { addingType?: string; deletingSectionId?: string; updatingSectionId?: string; nextType?: string }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  let heroCount = project.sections.filter((section) => section.type === "HERO").length;
  let detailCount = project.sections.filter((section) => section.type !== "HERO").length;

  if (options.addingType) {
    if (normalizeSectionType(options.addingType) === "HERO") {
      if (heroCount >= 5) {
        throw new Error("头图最多保留 5 张，请先删除或改成详情页后再新增。");
      }
      heroCount += 1;
    } else {
      if (detailCount >= 15) {
        throw new Error("详情页最多保留 15 张，请先删除或改成头图后再新增。");
      }
      detailCount += 1;
    }
  }

  if (options.deletingSectionId) {
    const target = project.sections.find((section) => section.id === options.deletingSectionId);
    if (!target) {
      throw new Error("Section not found.");
    }

    if (target.type === "HERO") {
      if (heroCount <= 3) {
        throw new Error("头图至少保留 3 张，不能继续删除。");
      }
      heroCount -= 1;
    } else {
      if (detailCount <= 4) {
        throw new Error("详情页至少保留 4 张，不能继续删除。");
      }
      detailCount -= 1;
    }
  }

  if (options.updatingSectionId && options.nextType) {
    const target = project.sections.find((section) => section.id === options.updatingSectionId);
    if (!target) {
      throw new Error("Section not found.");
    }

    const currentType = target.type;
    const nextType = normalizeSectionType(options.nextType);
    if (currentType !== nextType) {
      if (currentType === "HERO" && nextType !== "HERO") {
        if (heroCount <= 3) {
          throw new Error("头图至少保留 3 张，不能把当前头图改成详情页。");
        }
        if (detailCount >= 15) {
          throw new Error("详情页最多保留 15 张，请先删除多余详情页后再转换。");
        }
      }

      if (currentType !== "HERO" && nextType === "HERO") {
        if (detailCount <= 4) {
          throw new Error("详情页至少保留 4 张，不能把当前详情页改成头图。");
        }
        if (heroCount >= 5) {
          throw new Error("头图最多保留 5 张，请先删除多余头图后再转换。");
        }
      }
    }
  }
}

function buildPreviewDecisionPrompt(analysis: Record<string, unknown>, contentLanguage: ContentLanguage) {
  const context = {
    productName: analysis.productName,
    category: analysis.category,
    subcategory: analysis.subcategory,
    styleTags: Array.isArray(analysis.styleTags) ? analysis.styleTags.slice(0, 6) : [],
    usageScenarios: Array.isArray(analysis.usageScenarios) ? analysis.usageScenarios.slice(0, 6) : [],
    coreSellingPoints: Array.isArray(analysis.coreSellingPoints) ? analysis.coreSellingPoints.slice(0, 8) : [],
    differentiationPoints: Array.isArray(analysis.differentiationPoints)
      ? analysis.differentiationPoints.slice(0, 6)
      : [],
    suggestedSectionPlan: Array.isArray(analysis.suggestedSectionPlan) ? analysis.suggestedSectionPlan.slice(0, 8) : [],
  };

  return [
    "You are a senior e-commerce creative strategist deciding the right image count plan for a product detail page.",
    "Return strict JSON only.",
    "heroImageCount must be an integer between 3 and 5.",
    "detailSectionCount must be an integer between 4 and 10.",
    `The target content language for the final page is ${contentLanguage}.`,
    "Hero images should be enough to cover distinct first-screen communication angles such as hero visual, selling point emphasis, scenario mood, trust, or differentiation.",
    "Detail sections should be enough to fully explain selling points, craftsmanship, specs, trust, and use cases without becoming repetitive.",
    "If the product is simple, reduce quantity. If the product needs richer explanation, increase quantity.",
    "",
    "Product context:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

function buildFallbackDetail(index: number) {
  const template = detailFallbackSections[index % detailFallbackSections.length];
  return {
    type: normalizeSectionType(template.type),
    title: template.title,
    goal: template.goal,
    copy: template.copy,
    visualPrompt: template.visualPrompt,
    editableData: {
      ...template.editableFields,
      mainTitle: "",
      subTitle: "",
      layout: "",
      visualDescription: "",
      negativePrompt: "",
      colorScheme: null,
      whitespaceRatio: 35,
    },
  };
}

function buildFallbackHero(index: number) {
  const template = heroFallbackSections[index % heroFallbackSections.length];
  return {
    type: "HERO",
    title: template.title,
    goal: template.goal,
    copy: template.copy,
    visualPrompt: template.visualPrompt,
    editableData: {
      ...template.editableFields,
      mainTitle: "",
      subTitle: "",
      layout: "",
      visualDescription: "",
      negativePrompt: "",
      colorScheme: null,
      whitespaceRatio: 35,
    },
  };
}

function buildNormalizedSections(
  rawSections: RawPlannedSection[],
  heroImageCount: number,
  detailSectionCount: number,
): NormalizedSection[] {
  const normalized = rawSections.map((section, index) => {
    const editableFields = normalizeEditableFields(section.editableFields);
    return {
      type: normalizeSectionType(section.type),
      title: section.title || `模块 ${index + 1}`,
      goal: section.goal || "突出商品卖点",
      copy: section.copy || "",
      visualPrompt: ensureBilingualPrompt(section.visualPrompt || "", section.title || `模块 ${index + 1}`),
      editableData: {
        ...editableFields,
        mainTitle: (section as any).mainTitle || "",
        subTitle: (section as any).subTitle || "",
        layout: (section as any).layout || "",
        visualDescription: (section as any).visualDescription || "",
        negativePrompt: (section as any).negativePrompt || "",
        colorScheme: (section as any).colorScheme || null,
        whitespaceRatio: (section as any).whitespaceRatio || 35,
      },
    };
  });

  const heroPool = normalized.filter((section) => section.type === "HERO");
  const detailPool = normalized.filter((section) => section.type !== "HERO");

  const finalHeroes = heroPool.slice(0, heroImageCount);
  while (finalHeroes.length < heroImageCount) {
    finalHeroes.push(buildFallbackHero(finalHeroes.length));
  }

  const finalDetails = detailPool.slice(0, detailSectionCount);
  while (finalDetails.length < detailSectionCount) {
    finalDetails.push(buildFallbackDetail(finalDetails.length));
  }

  return [...finalHeroes, ...finalDetails].map((section, index) => {
    if (section.type === "HERO") {
      return {
        ...section,
        sectionKey: `hero_${String(index + 1).padStart(2, "0")}`,
        order: index,
      };
    }

    const detailIndex = index + 1 - finalHeroes.length;
    return {
      ...section,
      sectionKey: `detail_${String(detailIndex).padStart(2, "0")}_${section.type.toLowerCase()}`,
      order: index,
    };
  });
}

function buildFallbackPlanFromTemplates(heroImageCount: number, detailSectionCount: number) {
  return buildNormalizedSections([], heroImageCount, detailSectionCount);
}

function shouldFallbackToTemplatePlan(error: unknown) {
  if (error instanceof z.ZodError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /"sections"|expected array|invalid input: expected array|received undefined|section/i.test(error.message);
}

async function decidePreviewConfigWithAi(projectId: string, preferredModelId?: string | null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { analysis: true },
  });

  if (!project?.analysis) {
    throw new Error("请先完成商品分析，再进行页面规划。");
  }

  const { provider, adapter } = await getProviderAdapter("text");
  const model =
    preferredModelId ??
    provider.models.find((item) => item.isDefaultPlanning)?.modelId ??
    provider.models.find((item) => (item.capabilities as Record<string, boolean>).structured_output)?.modelId ??
    provider.models.find((item) => (item.capabilities as Record<string, boolean>).text)?.modelId ??
    provider.models[0]?.modelId;

  if (!model) {
    throw new Error("当前没有可用的文案规划模型。");
  }

  const currentPreviewConfig = readPreviewConfig(project.modelSnapshot);
  const prompt = buildPreviewDecisionPrompt(
    project.analysis.normalizedResult as Record<string, unknown>,
    currentPreviewConfig.contentLanguage,
  );
  const result = await adapter.generateStructured({
    model,
    systemPrompt: "Return strict JSON only.",
    userPrompt: prompt,
    schema: previewDecisionSchema,
    timeoutMs: 300000,
    monitor: {
      projectId,
      operation: "preview_count_planning",
    },
  });

  const current = readPreviewConfig(project.modelSnapshot);
  const decided = previewConfigSchema.parse({
    heroImageCount: result.parsed.heroImageCount,
    detailSectionCount: result.parsed.detailSectionCount,
    imageAspectRatio: current.imageAspectRatio,
    contentLanguage: current.contentLanguage,
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      modelSnapshot: {
        ...(project.modelSnapshot as Record<string, unknown> | null),
        previewConfig: decided,
        previewConfigSource: "ai",
        previewConfigReason: result.parsed.reason,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    previewConfig: decided,
    reason: result.parsed.reason,
  };
}

export async function planSections(
  projectId: string,
  options?: {
    modelId?: string | null;
    previewConfig?: PreviewConfigInput | null;
    autoDecideCounts?: boolean;
  },
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { analysis: true },
  });

  if (!project?.analysis) {
    throw new Error("请先完成商品分析，再进行页面规划。");
  }

  const { provider, adapter } = await getProviderAdapter("text");
  const model =
    options?.modelId ??
    provider.models.find((item) => item.isDefaultPlanning)?.modelId ??
    provider.models.find((item) => (item.capabilities as Record<string, boolean>).structured_output)?.modelId ??
    provider.models.find((item) => (item.capabilities as Record<string, boolean>).text)?.modelId ??
    provider.models[0]?.modelId;

  if (!model) {
    throw new Error("当前没有可用的文案规划模型。");
  }

  const existingTask = await findRecentRunningTask({
    projectId,
    taskType: "PLAN",
    maxAgeMinutes: 10,
  });
  if (existingTask) {
    throw new Error("当前页面规划仍在进行中，请等待这一轮完成后再试。");
  }

  let previewConfig =
    options?.previewConfig != null ? previewConfigSchema.parse(options.previewConfig) : readPreviewConfig(project.modelSnapshot);
  let previewDecisionReason = "";

  if (options?.autoDecideCounts) {
    const decision = await decidePreviewConfigWithAi(projectId, model);
    previewConfig = decision.previewConfig;
    previewDecisionReason = decision.reason;
  }

  const task = await createTask({
    projectId,
    taskType: "PLAN",
    inputPayload: { model, previewConfig, autoDecideCounts: Boolean(options?.autoDecideCounts) },
  });

  try {
    await prisma.pageSection.deleteMany({ where: { projectId } });

    const analysisResult = project.analysis.normalizedResult as Record<string, unknown>;
    const isClothing = isClothingCategory(
      String(analysisResult.category ?? ""),
      String(analysisResult.subcategory ?? ""),
    );

    let sections: NormalizedSection[];

    if (isClothing) {
      const clothingPrompt = buildClothingPlanningPrompt(
        project.analysis.normalizedResult as never,
        project.style,
        project.platform,
        previewConfig.heroImageCount,
        previewConfig.contentLanguage,
      );

      const clothingResult = await adapter.generateStructured({
        model,
        systemPrompt: "Return strict JSON only. sections must be complete. Follow the fixed clothing module structure exactly.",
        userPrompt: clothingPrompt,
        schema: sectionPlanOutputSchema,
        timeoutMs: 300000,
        monitor: {
          projectId,
          operation: "clothing_section_planning",
        },
      });

      const rawClothingSections = Array.isArray(clothingResult.parsed.sections)
        ? clothingResult.parsed.sections
        : [];

      sections =
        rawClothingSections.length > 0
          ? buildClothingSections(rawClothingSections, previewConfig.heroImageCount)
          : buildClothingFixedPlan(previewConfig.heroImageCount);

      previewConfig = { ...previewConfig, detailSectionCount: 11, imageAspectRatio: "3:4" as const };
      previewDecisionReason = "服装类产品，AI 智能规划固定详情页模块模板（3:4 比例）。";
    } else {
      const prompt = buildSectionPlanningPrompt(
        project.analysis.normalizedResult as never,
        project.style,
        project.platform,
        previewConfig.detailSectionCount,
        previewConfig.heroImageCount,
        previewConfig.contentLanguage,
      );

      const result = await adapter.generateStructured({
        model,
        systemPrompt: "Return strict JSON only. sections must be complete.",
        userPrompt: prompt,
        schema: sectionPlanOutputSchema,
        timeoutMs: 300000,
        monitor: {
          projectId,
          operation: "section_planning",
        }
      });

      const rawSections = Array.isArray(result.parsed.sections) ? result.parsed.sections : [];
      sections =
        rawSections.length > 0
          ? buildNormalizedSections(
              rawSections,
              previewConfig.heroImageCount,
              previewConfig.detailSectionCount,
            )
          : buildFallbackPlanFromTemplates(previewConfig.heroImageCount, previewConfig.detailSectionCount);
    }

    await prisma.pageSection.createMany({
      data: sections.map((section) => ({
        projectId,
        sectionKey: section.sectionKey,
        type: section.type as never,
        title: section.title,
        goal: section.goal,
        copy: section.copy,
        visualPrompt: section.visualPrompt,
        order: section.order,
        editableData: section.editableData as Prisma.InputJsonValue,
      })),
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "PLANNED",
        modelSnapshot: {
          ...(project.modelSnapshot as Record<string, unknown> | null),
          planningModelId: model,
          previewConfig,
          previewConfigSource: options?.autoDecideCounts ? "ai" : "manual",
          previewConfigReason: previewDecisionReason,
        } as Prisma.InputJsonValue,
      },
    });

    const saved = await prisma.pageSection.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });
    await completeTask(task.id, { sections: saved, previewConfig, previewDecisionReason });
    return {
      sections: saved,
      previewConfig,
      previewDecisionReason,
    };
  } catch (error) {
    if (shouldFallbackToTemplatePlan(error)) {
      try {
        await prisma.pageSection.deleteMany({ where: { projectId } });
        const fallbackSections = buildFallbackPlanFromTemplates(
          previewConfig.heroImageCount,
          previewConfig.detailSectionCount,
        );
        await prisma.pageSection.createMany({
          data: fallbackSections.map((section) => ({
            projectId,
            sectionKey: section.sectionKey,
            type: section.type as never,
            title: section.title,
            goal: section.goal,
            copy: section.copy,
            visualPrompt: section.visualPrompt,
            order: section.order,
            editableData: section.editableData as Prisma.InputJsonValue,
          })),
        });

        await prisma.project.update({
          where: { id: projectId },
          data: {
            status: "PLANNED",
            modelSnapshot: {
              ...(project.modelSnapshot as Record<string, unknown> | null),
              planningModelId: model,
              previewConfig,
              previewConfigSource: options?.autoDecideCounts ? "ai" : "manual",
              previewConfigReason: `${previewDecisionReason ? `${previewDecisionReason}；` : ""}AI 返回结构不完整，已自动切换为模板规划。`,
            } as Prisma.InputJsonValue,
          },
        });

        const saved = await prisma.pageSection.findMany({
          where: { projectId },
          orderBy: { order: "asc" },
        });

        await completeTask(task.id, {
          sections: saved,
          previewConfig,
          previewDecisionReason,
          fallbackMode: "template_plan",
        });

        return {
          sections: saved,
          previewConfig,
          previewDecisionReason,
          fallbackMode: "template_plan" as const,
        };
      } catch {
        await failTask(task.id, "AI 规划结果格式不完整，且模板规划回退失败。");
        throw new Error("AI 规划结果格式不完整，请稍后重试。");
      }
    }

    const message =
      error instanceof Error
        ? error.message.includes("timed out")
          ? "页面规划请求超时，请稍后重试，或在 AI 配置里改用更快的规划模型。"
          : error.message
        : "页面规划失败";
    await failTask(task.id, message);
    throw new Error(message);
  }
}

export async function createSection(
  projectId: string,
  input: {
    type: string;
    title: string;
    goal: string;
    copy: string;
    visualPrompt: string;
    editableFields?: Record<string, unknown>;
  },
) {
  await assertSectionMutationAllowed(projectId, { addingType: input.type });
  const count = await prisma.pageSection.count({ where: { projectId } });
  const created = await prisma.pageSection.create({
    data: {
      projectId,
      sectionKey:
        normalizeSectionType(input.type) === "HERO"
          ? `hero_${String(count + 1).padStart(2, "0")}`
          : `detail_${String(count + 1).padStart(2, "0")}_${nanoid(6)}`,
      type: normalizeSectionType(input.type) as never,
      title: input.title,
      goal: input.goal,
      copy: input.copy,
      visualPrompt: ensureBilingualPrompt(input.visualPrompt, input.title),
      order: count,
      editableData: (input.editableFields ?? {}) as Prisma.InputJsonValue,
    },
  });
  await normalizeProjectSections(projectId);
  return created;
}

export async function updateSection(sectionId: string, input: Record<string, unknown>) {
  const current = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { projectId: true },
  });

  if (!current) {
    throw new Error("Section not found.");
  }

  if ("type" in input && typeof input.type === "string") {
    await assertSectionMutationAllowed(current.projectId, {
      updatingSectionId: sectionId,
      nextType: input.type,
    });
  }

  const payload = { ...input } as Record<string, unknown>;
  if ("visualPrompt" in payload && typeof payload.visualPrompt === "string") {
    payload.visualPrompt = ensureBilingualPrompt(payload.visualPrompt, String(payload.title ?? "当前模块"));
  }
  if ("type" in payload && typeof payload.type === "string") {
    payload.type = normalizeSectionType(payload.type) as never;
  }
  if ("editableData" in payload) {
    payload.editableData = payload.editableData as Prisma.InputJsonValue;
  }
  const updated = await prisma.pageSection.update({
    where: { id: sectionId },
    data: payload,
  });
  await normalizeProjectSections(current.projectId);
  return updated;
}

export async function deleteSection(sectionId: string) {
  const current = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { projectId: true },
  });

  if (!current) {
    throw new Error("Section not found.");
  }

  await assertSectionMutationAllowed(current.projectId, { deletingSectionId: sectionId });
  const deleted = await prisma.pageSection.delete({
    where: { id: sectionId },
  });
  await normalizeProjectSections(current.projectId);
  return deleted;
}

export async function reorderSections(projectId: string, orderedSectionIds: string[]) {
  await prisma.$transaction(
    orderedSectionIds.map((sectionId, index) =>
      prisma.pageSection.update({
        where: { id: sectionId },
        data: { order: index },
      }),
    ),
  );

  await normalizeProjectSections(projectId);

  return prisma.pageSection.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
}
