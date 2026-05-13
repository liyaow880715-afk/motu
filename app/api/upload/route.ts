import { NextRequest } from "next/server";

import { saveUploadAsset } from "@/lib/storage/asset-manager";
import { handleRouteError, ok, fail } from "@/lib/utils/route";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = (formData.get("projectId") as string) || "global";
    const type = (formData.get("type") as string) || "REFERENCE";

    if (!file) {
      throw new Error("file is required");
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail("FILE_TOO_LARGE", `文件大小超过限制 (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB)`, null, 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const asset = await saveUploadAsset({
      projectId,
      type: type as any,
      fileName: file.name,
      mimeType: file.type,
      fileBuffer: buffer,
      sortOrder: 0,
      isMain: false,
    });

    return ok(asset, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
