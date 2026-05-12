import { NextRequest } from "next/server";

import { analyzeVideo } from "@/lib/services/video-service";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return ok({ analysis: null, error: "请上传视频文件" });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await analyzeVideo(buffer, file.name);

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
