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

const synthesizeSchema = z.object({
  storyboard: z.object({
    title: z.string().optional(),
    hook: z.any(),
    scenes: z.array(z.any()),
    cta: z.any(),
    total_duration: z.number().optional(),
    bgm_mood: z.string().optional().nullable(),
    style_notes: z.string().optional().nullable(),
    video_aspect: z.string().optional().nullable(),
  }),
  sceneImages: z.record(z.string(), z.string().min(1)),
  voiceName: z.string().optional().default("zh-CN-XiaoxiaoNeural"),
  voiceRate: z.number().optional().default(1.0),
  transitionMode: z.string().optional().nullable(),
  bgmBase64: z.string().optional().nullable(),
  bgmFileName: z.string().optional().nullable(),
});

function saveBase64ToTemp(base64: string, index: string): string {
  const buffer = Buffer.from(base64, "base64");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bm-synth-"));
  const filePath = path.join(tmpDir, `scene_${index}.jpg`);
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

    const body = synthesizeSchema.parse(await request.json());

    // Build ordered image list: hook (index 0) -> scenes (index 1..n) -> cta (last)
    const allScenes = [
      body.storyboard.hook,
      ...body.storyboard.scenes,
      body.storyboard.cta,
    ];

    const orderedKeys = allScenes.map((s) => String(s.index));
    const orderedBase64s = orderedKeys.map((k) => body.sceneImages[k]).filter(Boolean);

    if (orderedBase64s.length === 0) {
      throw new Error("没有可用的场景图片");
    }

    // Save base64 images to temp files
    tempPaths = orderedBase64s.map((b64, i) => saveBase64ToTemp(b64, String(i)));

    // Get provider config
    const providerConfig = await getVideoProviderConfig();

    // Build multipart form data
    const formData = new FormData();
    for (const p of tempPaths) {
      const blob = new Blob([new Uint8Array(fs.readFileSync(p))], { type: "image/jpeg" });
      formData.append("files", blob, path.basename(p));
    }

    const storyboardJson = JSON.stringify(body.storyboard);
    formData.append("storyboard", storyboardJson);
    formData.append("voice_name", body.voiceName);
    formData.append("voice_rate", String(body.voiceRate));
    if (body.transitionMode) {
      formData.append("transition_mode", body.transitionMode);
    }
    formData.append("provider_config", JSON.stringify(providerConfig));

    // Optional BGM
    if (body.bgmBase64) {
      const bgmBuffer = Buffer.from(body.bgmBase64, "base64");
      const bgmBlob = new Blob([new Uint8Array(bgmBuffer)], { type: "audio/mpeg" });
      formData.append("bgm_file", bgmBlob, body.bgmFileName || "bgm.mp3");
    }

    const response = await fetch(`${MPT_BASE_URL}/synthesize`, {
      method: "POST",
      body: formData as any,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`视频合成提交失败: ${response.status} ${text}`);
    }

    const payload = await response.json();
    if (payload.status !== 200 || !payload.data?.task_id) {
      throw new Error(payload.message || "视频合成提交失败");
    }

    return ok({ taskId: payload.data.task_id });
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
        // ignore cleanup errors
      }
    }
  }
}
