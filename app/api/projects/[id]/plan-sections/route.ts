import { NextRequest } from "next/server";
import { z } from "zod";

import { planSections } from "@/lib/services/planner-service";
import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";
import { handleRouteError, ok } from "@/lib/utils/route";

export const maxDuration = 300;

const planRequestSchema = z.object({
  modelId: z.string().optional().nullable(),
  autoDecideCounts: z.boolean().optional(),
  previewConfig: z
    .object({
      heroImageCount: z.number().int().min(3).max(5),
      detailSectionCount: z.number().int().min(4).max(10),
      imageAspectRatio: z.enum(["3:4", "9:16"]),
      contentLanguage: z.enum(["zh-CN", "en-US", "ja-JP", "ko-KR"]),
    })
    .optional(),
});

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const input = planRequestSchema.parse(await request.json().catch(() => ({})));
    const accessKey = getAccessKeyFromHeader(request);

    if (accessKey) {
      await checkAndDeductCredits(accessKey);
    }

    try {
      const result = await planSections(context.params.id, {
        modelId: input.modelId,
        autoDecideCounts: input.autoDecideCounts,
        previewConfig: input.previewConfig,
      });
      return ok(result);
    } catch (error) {
      if (accessKey) {
        await refundCredits(accessKey);
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
