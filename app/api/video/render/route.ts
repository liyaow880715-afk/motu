import { NextRequest } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const accessKey = getAccessKeyFromHeader(request);
  try {
    if (!accessKey) {
      return Response.json({ success: false, error: { message: "缺少访问密钥" } }, { status: 401 });
    }
    await checkAndDeductCredits(accessKey);

    const { compositionId = "TutorialVideo" } = await request.json().catch(() => ({}));
    const outputDir = path.join(process.cwd(), "public", "videos");
    const outputPath = path.join(outputDir, `${compositionId.toLowerCase()}.mp4`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Check if already rendering
    const lockFile = path.join(process.cwd(), "public", "videos", `.${compositionId}.lock`);
    if (fs.existsSync(lockFile)) {
      return Response.json(
        { success: false, error: { message: "视频正在渲染中，请稍后再试" } },
        { status: 429 }
      );
    }

    // Create lock file
    fs.writeFileSync(lockFile, String(Date.now()));

    try {
      const entryFile = path.join(process.cwd(), "remotion", "src", "index.tsx");
      const cmd = `npx remotion render "${entryFile}" "${compositionId}" "${outputPath}" --log=error`;

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 600000, // 10 minutes
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      return Response.json({
        success: true,
        data: {
          compositionId,
          outputPath: `/videos/${compositionId.toLowerCase()}.mp4`,
          stdout: stdout.slice(-500),
          stderr: stderr.slice(-500),
        },
      });
    } finally {
      // Clean up lock file
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    }
  } catch (error) {
    if (accessKey) await refundCredits(accessKey);
    const message = error instanceof Error ? error.message : "渲染失败";
    return Response.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}
