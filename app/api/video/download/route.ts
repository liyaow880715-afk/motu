import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/utils/route";

const MPT_BASE_URL = process.env.MPT_BASE_URL || "http://localhost:8080";

const downloadSchema = z.object({
  taskId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = downloadSchema.parse(await request.json());

    // Query MPT task status
    const taskRes = await fetch(`${MPT_BASE_URL}/tasks/${body.taskId}`);
    if (!taskRes.ok) {
      throw new Error("无法获取任务状态");
    }
    const taskPayload = await taskRes.json();
    const task = taskPayload.data || taskPayload;

    if (task.status !== "completed") {
      throw new Error(`任务尚未完成，当前状态: ${task.status || "未知"}`);
    }

    const videos: string[] = task.videos || task.combined_videos || [];
    if (videos.length === 0) {
      throw new Error("任务已完成但未找到视频文件");
    }

    // Download the first video from MPT
    const mptVideoUrl = videos[0];
    const videoRes = await fetch(mptVideoUrl);
    if (!videoRes.ok) {
      throw new Error("从 MPT 下载视频失败");
    }

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const storageDir = path.join(process.cwd(), "public", "videos");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(storageDir, fileName);
    fs.writeFileSync(filePath, videoBuffer);

    return ok({
      url: `/videos/${fileName}`,
      fileName,
      size: videoBuffer.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
