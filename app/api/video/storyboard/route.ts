import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { z } from "zod";

import { getVideoProviderConfig } from "@/lib/services/video-service";
import { handleRouteError, ok } from "@/lib/utils/route";

const MPT_BASE_URL = process.env.MPT_BASE_URL || "http://localhost:8080";

const storyboardRequestSchema = z.object({
  productImages: z.array(z.string().min(1)).min(1, "至少需要一张产品图片"),
  prompt: z.string().min(1, "请输入产品卖点描述"),
  targetDuration: z.number().min(5).max(60).default(15),
  style: z.string().default("auto"),
  audience: z.string().optional(),
  videoAspect: z.string().default("9:16"),
  videoCount: z.number().min(1).max(10).default(1),
});

function saveBase64ToTemp(base64: string, index: number): string {
  const buffer = Buffer.from(base64, "base64");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bm-video-"));
  const filePath = path.join(tmpDir, `product_${index}.jpg`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function POST(request: NextRequest) {
  let tempPaths: string[] = [];

  try {
    const body = storyboardRequestSchema.parse(await request.json());

    // Save base64 images to temp files
    tempPaths = body.productImages.map((b64, i) => saveBase64ToTemp(b64, i));

    // Build product_input JSON
    const productInput = {
      product_images: tempPaths,
      prompt: body.prompt,
      target_duration: body.targetDuration,
      style: body.style,
      audience: body.audience,
      video_aspect: body.videoAspect,
      video_count: body.videoCount,
    };

    // Get provider config
    const providerConfig = await getVideoProviderConfig();

    // Build multipart form data
    const formData = new FormData();
    for (const p of tempPaths) {
      const blob = new Blob([new Uint8Array(fs.readFileSync(p))], { type: "image/jpeg" });
      formData.append("files", blob, path.basename(p));
    }
    formData.append("product_input", JSON.stringify(productInput));
    formData.append("provider_config", JSON.stringify(providerConfig));

    const response = await fetch(`${MPT_BASE_URL}/storyboard`, {
      method: "POST",
      body: formData as any,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MPT storyboard failed: ${response.status} ${text}`);
    }

    const payload = await response.json();
    if (payload.status !== 200 || !payload.data?.storyboards) {
      throw new Error(payload.message || "Storyboard generation failed");
    }

    return ok({ storyboards: payload.data.storyboards });
  } catch (error) {
    return handleRouteError(error);
  } finally {
    // Clean up temp files
    for (const p of tempPaths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
        const dir = path.dirname(p);
        if (fs.existsSync(dir)) fs.rmdirSync(dir);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
