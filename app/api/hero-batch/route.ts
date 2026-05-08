import { NextRequest } from "next/server";
import { z } from "zod";
import { getProviderAdapter } from "@/lib/services/provider-service";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok } from "@/lib/utils/route";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const heroBatchSchema = z.object({
  productName: z.string().min(1, "请输入商品名称"),
  productDescription: z.string().optional(),
  productImage: z.string().optional(), // single image fallback
  productImages: z.array(z.string()).optional(), // multiple product images
  style: z.string().min(1, "请选择风格"),
  aspectRatio: z.string().default("1:1"),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = heroBatchSchema.parse(await request.json());
    const { provider, adapter } = await getProviderAdapter("image");

    const model = provider.models.find((m) => {
      const caps = m.capabilities as Record<string, unknown>;
      return caps?.image_gen && caps?.real_image_gen !== false;
    })?.modelId ?? provider.models[0]?.modelId ?? "";

    // Parse size from aspect ratio
    const sizeMap: Record<string, string> = {
      "1:1": "1024x1024",
      "3:4": "768x1024",
      "4:3": "1024x768",
      "16:9": "1024x576",
    };
    const size = sizeMap[parsed.aspectRatio] ?? "1024x1024";

    // Build prompt with explicit size/aspect instruction
    const aspectInstruction = parsed.aspectRatio
      ? `图片必须严格保持 ${parsed.aspectRatio} 的宽高比例。`
      : `图片尺寸必须严格为 ${size} 像素。`;
    const prompt = `电商主图，商品：${parsed.productName}。${parsed.productDescription ?? ""}。${parsed.style}。${aspectInstruction}高质量商品摄影，适合电商平台头图展示。`;

    // Reference images (support both single and multiple)
    const referenceImages: string[] = [];
    if (parsed.productImages && parsed.productImages.length > 0) {
      for (const img of parsed.productImages) {
        if (img.startsWith("data:")) referenceImages.push(img);
      }
    } else if (parsed.productImage?.startsWith("data:")) {
      referenceImages.push(parsed.productImage);
    }

    const result = await adapter.generateImage({
      model,
      prompt,
      size,
      aspectRatio: parsed.aspectRatio as "1:1" | "3:4" | "4:3" | "16:9" | "9:16",
      referenceImages,
    });

    // Save image
    let imageUrl: string;
    const storageDir = join(env.STORAGE_ROOT ?? "./storage", "hero-batch");
    if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });

    if (result.url) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch(result.url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          throw new Error(`下载图片失败: ${res.status}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `hero-batch-${Date.now()}.png`;
        const filePath = join(storageDir, fileName);
        writeFileSync(filePath, buffer);
        imageUrl = `/api/files/hero-batch/${fileName}`;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    } else if (result.b64Json) {
      const buffer = Buffer.from(result.b64Json, "base64");
      const fileName = `hero-batch-${Date.now()}.png`;
      const filePath = join(storageDir, fileName);
      writeFileSync(filePath, buffer);
      imageUrl = `/api/files/hero-batch/${fileName}`;
    } else {
      throw new Error("图片生成返回为空");
    }

    return ok({ imageUrl, model });
  } catch (error) {
    return handleRouteError(error);
  }
}
