import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getTemplateById } from "@/lib/services/template-service";
import { handleRouteError, ok } from "@/lib/utils/route";

const applySchema = z.object({
  name: z.string().min(2, "项目名称至少 2 个字"),
  platform: z.string().min(1, "请选择平台"),
  style: z.string().min(1, "请选择风格"),
  description: z.string().optional(),
  productName: z.string().min(1, "请输入商品名称"),
  productCategory: z.string().min(1, "请输入商品品类"),
});

const SECTION_TYPE_MAP: Record<string, string> = {
  hero: "HERO",
  feature: "SELLING_POINTS",
  scene: "SCENARIO",
  spec: "SPECS",
  model: "SCENARIO",
  gallery: "DETAIL_CLOSEUP",
  material: "MATERIAL",
  flatlay: "DETAIL_CLOSEUP",
  detail: "DETAIL_CLOSEUP",
  cert: "BRAND_TRUST",
  brand_trust: "BRAND_TRUST",
  selling_points: "SELLING_POINTS",
  comparison: "COMPARISON",
  custom: "CUSTOM",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = applySchema.parse(await request.json());
    const template = await getTemplateById(id);

    if (!template) {
      return handleRouteError(new Error("模板不存在"));
    }

    const structure = template.structureJson as Record<string, unknown>;
    const modules = (structure.modules ?? []) as Array<Record<string, unknown>>;

    // Create project
    const project = await prisma.project.create({
      data: {
        name: parsed.name,
        platform: parsed.platform,
        style: parsed.style,
        description: parsed.description ?? null,
        status: "PLANNED",
      },
    });

    // Create analysis record
    await prisma.productAnalysis.create({
      data: {
        projectId: project.id,
        rawResult: {
          productName: parsed.productName,
          category: parsed.productCategory,
          description: parsed.description,
        },
        normalizedResult: {
          productName: parsed.productName,
          category: parsed.productCategory,
          description: parsed.description,
          sellingPoints: [],
          targetAudience: "",
          usageScenarios: [],
          keyFeatures: [],
        },
      },
    });

    // Create sections from template modules
    const styleProfile = (template.styleProfile ?? {}) as Record<string, unknown>;
    const overallStyle = (styleProfile.overallStyle ?? template.description ?? "") as string;

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      const typeKey = String(mod.type ?? "custom").toLowerCase();
      const sectionType = SECTION_TYPE_MAP[typeKey] ?? "CUSTOM";
      const styleNotes = String(mod.styleNotes ?? "");
      const name = String(mod.name ?? `模块 ${i + 1}`);

      await prisma.pageSection.create({
        data: {
          projectId: project.id,
          sectionKey: `section_${i + 1}`,
          type: sectionType as any,
          title: name,
          goal: `基于模板风格生成：${overallStyle}`,
          copy: `商品：${parsed.productName}。${styleNotes}`,
          visualPrompt: `生成${name}图片。商品：${parsed.productName}。风格要求：${overallStyle}。${styleNotes}`,
          order: Number(mod.order ?? i + 1),
          editableData: {
            aspectRatio: mod.aspectRatio ?? "3:4",
            bgType: mod.bgType ?? "纯白",
            textLayout: mod.textLayout ?? "",
            templateModuleType: typeKey,
            templateReferenceImageUrl: template.referenceImageUrl,
            templateName: template.name,
            position: mod.position ?? null,
          },
        },
      });
    }

    return ok({ projectId: project.id, sectionCount: modules.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
