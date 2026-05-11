import { NextRequest } from "next/server";

import { saveUploadAsset } from "@/lib/storage/asset-manager";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = (formData.get("projectId") as string) || "global";
    const type = (formData.get("type") as string) || "REFERENCE";

    if (!file) {
      throw new Error("file is required");
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
