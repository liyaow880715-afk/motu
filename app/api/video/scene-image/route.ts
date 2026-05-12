import { NextRequest } from "next/server";
import { z } from "zod";

import { getProviderAdapter } from "@/lib/services/provider-service";
import { handleRouteError, ok } from "@/lib/utils/route";

const sceneImageSchema = z.object({
  visualDesc: z.string().min(1, "请输入视觉描述"),
  productImages: z.array(z.string()).optional().default([]),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "16:9", "9:16"]).optional().default("9:16"),
});

export async function POST(request: NextRequest) {
  try {
    const body = sceneImageSchema.parse(await request.json());

    const ctx = await getProviderAdapter("image");
    const defaultModel =
      ctx.provider.models.find((m) => m.isDefaultHeroImage) ||
      ctx.provider.models.find((m) => m.isDefaultDetailImage) ||
      ctx.provider.models[0];

    if (!defaultModel) {
      throw new Error("未配置图片生成模型，请先在 AI 配置中设置图片服务");
    }

    const result = await ctx.adapter.generateImage({
      model: defaultModel.modelId,
      prompt: body.visualDesc,
      aspectRatio: body.aspectRatio,
      referenceImages: body.productImages.length > 0 ? body.productImages : undefined,
    });

    if (!result.b64Json && !result.url) {
      throw new Error("图片生成失败，未返回有效图像");
    }

    return ok({
      b64Json: result.b64Json,
      url: result.url,
      revisedPrompt: result.revisedPrompt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
