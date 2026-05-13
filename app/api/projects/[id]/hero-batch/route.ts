import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { generateSectionImage } from "@/lib/services/generation-service";
import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";
import { handleRouteError, ok } from "@/lib/utils/route";

const heroBatchSchema = z.object({
  count: z.number().min(2).max(8).default(4),
  styles: z.array(z.string()).min(1).optional(),
});

const DEFAULT_HERO_STYLES = [
  "高端简约白底图，产品居中，柔和影棚光，干净背景，突出材质质感",
  "生活场景图，产品摆放在木质桌面上，自然窗光，温暖氛围，有绿植点缀",
  "户外街拍风格，模特手持产品，城市背景虚化，阳光照射，时尚杂志感",
  "极简艺术风，纯色渐变背景，产品悬浮，柔和阴影，高级感",
  "礼盒开箱场景，产品放置在精美包装中，丝带装饰，节日氛围",
  "俯拍平铺图，产品与配件整齐排列在浅色布面上，ins 风",
  "暗黑高级感，黑色背景，聚光灯打在产品上，金属光泽，科技风",
  "温馨居家风，产品放在沙发/床头，暖黄灯光，生活气息",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const parsed = heroBatchSchema.parse(await request.json());

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sections: { orderBy: { order: "asc" } },
        assets: true,
      },
    });

    if (!project) {
      return handleRouteError(new Error("项目不存在"));
    }

    const heroSection = project.sections.find((s) => s.type === "HERO");
    if (!heroSection) {
      return handleRouteError(new Error("项目中没有头图模块"));
    }

    const styles = parsed.styles?.slice(0, parsed.count) ?? DEFAULT_HERO_STYLES.slice(0, parsed.count);
    const results: Array<{ index: number; style: string; success: boolean; assetId?: string; error?: string }> = [];
    const accessKey = getAccessKeyFromHeader(request);

    for (let i = 0; i < styles.length; i++) {
      const style = styles[i];
      try {
        if (accessKey) {
          await checkAndDeductCredits(accessKey);
        }

        // Update section visual prompt with current style
        await prisma.pageSection.update({
          where: { id: heroSection.id },
          data: {
            visualPrompt: `生成电商头图。${style}`,
            copy: `批量头图生成 #${i + 1}：${style}`,
          },
        });

        const result = await generateSectionImage(projectId, heroSection.id, undefined, undefined);
        results.push({
          index: i,
          style,
          success: true,
          assetId: result.imageAsset.id,
        });
      } catch (error) {
        if (accessKey) {
          await refundCredits(accessKey);
        }
        results.push({
          index: i,
          style,
          success: false,
          error: error instanceof Error ? error.message : "生成失败",
        });
      }

      // Delay between requests
      if (i < styles.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // Restore original section data
    await prisma.pageSection.update({
      where: { id: heroSection.id },
      data: {
        visualPrompt: heroSection.visualPrompt,
        copy: heroSection.copy,
      },
    });

    return ok({ results, generatedCount: results.filter((r) => r.success).length });
  } catch (error) {
    return handleRouteError(error);
  }
}
