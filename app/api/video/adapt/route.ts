import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { z } from "zod";

import { getVideoProviderConfig } from "@/lib/services/video-service";
import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";
import { handleRouteError, ok } from "@/lib/utils/route";

const MPT_BASE_URL = process.env.MPT_BASE_URL || "http://localhost:8080";

const adaptSchema = z.object({
  analysis: z.object({
    original_duration: z.number(),
    original_script: z.string(),
    storyboard: z.any(),
    hook_type: z.string().optional().nullable(),
    pacing: z.string().optional().nullable(),
    bgm_description: z.string().optional().nullable(),
    color_grade: z.string().optional().nullable(),
  }),
  productImages: z.array(z.string().min(1)).min(1, "至少需要一张产品图片"),
  replacementPrompt: z.string().min(1, "请输入新产品卖点"),
});

function saveBase64ToTemp(base64: string, index: number): string {
  const buffer = Buffer.from(base64, "base64");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bm-adapt-"));
  const filePath = path.join(tmpDir, `product_${index}.jpg`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function POST(request: NextRequest) {
  const accessKey = getAccessKeyFromHeader(request);
  let tempPaths: string[] = [];
  try {
    if (!accessKey) {
      return ok({ error: "缺少访问密钥" });
    }
    await checkAndDeductCredits(accessKey);

    const body = adaptSchema.parse(await request.json());

    tempPaths = body.productImages.map((b64, i) => saveBase64ToTemp(b64, i));

    const providerConfig = await getVideoProviderConfig();

    const formData = new FormData();
    for (const p of tempPaths) {
      const blob = new Blob([new Uint8Array(fs.readFileSync(p))], { type: "image/jpeg" });
      formData.append("files", blob, path.basename(p));
    }

    formData.append("analysis", JSON.stringify(body.analysis));
    formData.append("replacement_prompt", body.replacementPrompt);
    formData.append("provider_config", JSON.stringify(providerConfig));

    const response = await fetch(`${MPT_BASE_URL}/adapt-storyboard`, {
      method: "POST",
      body: formData as any,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`分镜复刻失败: ${response.status} ${text}`);
    }

    const payload = await response.json();
    if (payload.status !== 200 || !payload.data?.storyboard) {
      throw new Error(payload.message || "分镜复刻失败");
    }

    return ok({ storyboard: payload.data.storyboard });
  } catch (error) {
    if (accessKey) await refundCredits(accessKey);
    return handleRouteError(error);
  } finally {
    for (const p of tempPaths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
        const dir = path.dirname(p);
        if (fs.existsSync(dir)) fs.rmdirSync(dir);
      } catch {
        // ignore
      }
    }
  }
}
