import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

import { handleRouteError, ok } from "@/lib/utils/route";

export async function GET(_request: NextRequest) {
  try {
    const videoDir = path.join(process.cwd(), "public", "videos");
    if (!fs.existsSync(videoDir)) {
      return ok({ videos: [] });
    }

    const files = fs
      .readdirSync(videoDir)
      .filter((f) => f.endsWith(".mp4"))
      .map((f) => {
        const stat = fs.statSync(path.join(videoDir, f));
        return {
          fileName: f,
          url: `/videos/${f}`,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return ok({ videos: files });
  } catch (error) {
    return handleRouteError(error);
  }
}
