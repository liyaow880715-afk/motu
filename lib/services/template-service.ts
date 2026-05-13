import { prisma } from "@/lib/db/prisma";
import { getProviderAdapter } from "@/lib/services/provider-service";
import type { TemplateStructure, TemplateStyleProfile } from "@/types/template";

const ANALYSIS_PROMPT = `你是一个电商视觉分析专家。请根据用户提供的详情页描述，输出结构化的视觉分析结果。

输出必须是以下 JSON 格式（不要包含 markdown 代码块标记，只输出纯 JSON）：
{
  "overallStyle": "整体风格描述，如：温暖日系，浅米色底，手写体文案，暖光摄影",
  "colorPalette": ["#FFFFFF", "#1A1A1A", "#C9A96E"],
  "typography": {
    "heading": "标题字体风格描述",
    "subheading": "副标题字体风格描述",
    "body": "正文字体风格描述",
    "tags": "标签样式描述"
  },
  "modules": [
    {
      "type": "hero|feature|scene|spec|model|gallery|material|flatlay|detail|cert|brand_trust|selling_points|comparison|custom",
      "order": 1,
      "name": "模块名称",
      "aspectRatio": "3:4|1:1|4:3|4:5|16:9",
      "styleNotes": "该模块的视觉风格描述",
      "textLayout": "文案排版方式",
      "bgType": "纯白|浅灰纯色|实景照片|深色纹理|照片拼接|细节图深色",
      "position": {
        "topPercent": 0.0,
        "bottomPercent": 0.15
      }
  ]
}

模块类型说明：
- hero: 品牌头图/主视觉
- feature: 卖点/特性展示
- scene: 场景/门店展示
- spec: 规格参数/尺码表
- model: 真人模特试穿
- gallery: 多角度展示/轮播
- material: 面料/材质卖点
- flatlay: 平铺展示
- detail: 细节特写
- cert: 证书/水洗标/吊牌
- brand_trust: 品牌信任状
- selling_points: 核心卖点
- comparison: 对比展示
- custom: 自定义模块

请根据描述生成至少 5 个、最多 12 个模块。`;

export async function analyzeTemplate(
  description: string,
  imageUrls?: string[],
): Promise<{ structure: TemplateStructure; rawText: string }> {
  const { adapter, provider } = await getProviderAdapter("text");

  const defaultAnalysisModel = provider.models.find((m) => (m as any).isDefaultAnalysis);
  const hasVision = (m: typeof provider.models[0]) => {
    const caps = m.capabilities as Record<string, unknown>;
    return Boolean(caps?.vision && (caps?.text || caps?.structured_output));
  };

  let selectedModel: typeof provider.models[0] | undefined;

  if (imageUrls?.length) {
    if (defaultAnalysisModel && hasVision(defaultAnalysisModel)) {
      selectedModel = defaultAnalysisModel;
    } else {
      selectedModel = provider.models.find(hasVision);
    }
  } else {
    selectedModel = defaultAnalysisModel ?? provider.models[0];
  }

  const modelId = selectedModel?.modelId ?? provider.models[0]?.modelId ?? "";

  const userPrompt = imageUrls?.length
    ? `请分析这张电商详情页长图，拆解它的模块结构和视觉风格。${description ? "\n用户补充描述：\n" + description : ""}`
    : `用户描述的详情页内容：\n${description}`;

  const result = await adapter.generateText({
    model: modelId,
    systemPrompt: ANALYSIS_PROMPT,
    userPrompt,
    images: imageUrls,
    timeoutMs: 180000,
  });

  let parsed: TemplateStructure;
  try {
    const cleaned = result.text.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned) as TemplateStructure;
  } catch {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]) as TemplateStructure;
    } else {
      throw new Error("AI 分析结果格式不正确，无法解析为 JSON");
    }
  }

  if (!parsed.modules || !Array.isArray(parsed.modules) || parsed.modules.length === 0) {
    throw new Error("AI 分析结果缺少模块数据");
  }

  parsed.modules = parsed.modules.map((m, i) => ({
    ...m,
    order: m.order ?? i + 1,
    type: m.type ?? "custom",
    aspectRatio: m.aspectRatio ?? "3:4",
  }));

  return { structure: parsed, rawText: result.text };
}

export async function createTemplate(input: {
  name: string;
  referenceImageUrl: string;
  structureJson: TemplateStructure;
  styleProfile: TemplateStyleProfile;
  category?: string;
  description?: string;
  rawAnalysis?: string;
}) {
  const moduleCount = input.structureJson.modules.length;

  const template = await prisma.template.create({
    data: {
      name: input.name,
      referenceImageUrl: input.referenceImageUrl,
      structureJson: input.structureJson as any,
      styleProfile: input.styleProfile as any,
      category: input.category ?? "general",
      description: input.description ?? null,
      rawAnalysis: input.rawAnalysis ?? null,
      moduleCount,
    },
  });

  return template;
}

export async function getAllTemplates(category?: string) {
  const templates = await prisma.template.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return templates;
}

export async function getTemplateById(id: string) {
  const template = await prisma.template.findUnique({
    where: { id },
  });

  return template;
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({
    where: { id },
  });
}

export async function updateTemplate(
  id: string,
  input: {
    name?: string;
    structureJson?: TemplateStructure;
    styleProfile?: TemplateStyleProfile;
    category?: string;
    description?: string;
  },
) {
  const template = await prisma.template.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.structureJson !== undefined && { structureJson: input.structureJson as any }),
      ...(input.styleProfile !== undefined && { styleProfile: input.styleProfile as any }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.structureJson !== undefined && { moduleCount: input.structureJson.modules.length }),
    },
  });

  return template;
}
