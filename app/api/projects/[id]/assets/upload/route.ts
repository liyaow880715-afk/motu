import { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { saveUploadAsset } from "@/lib/storage/asset-manager";
import { handleRouteError, ok, fail } from "@/lib/utils/route";

const MAX_BASE64_SIZE = 20 * 1024 * 1024; // 20MB raw limit

const uploadAssetSchema = z.object({
  type: z.enum(["MAIN", "ANGLE", "DETAIL", "REFERENCE", "PACKAGING", "NUTRITION", "INGREDIENT"]),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1),
});

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const input = uploadAssetSchema.parse(await request.json());
    const buffer = Buffer.from(input.base64Data, "base64");
    if (buffer.byteLength > MAX_BASE64_SIZE) {
      return fail("FILE_TOO_LARGE", `文件大小超过限制 (${(MAX_BASE64_SIZE / 1024 / 1024).toFixed(0)}MB)`, null, 413);
    }

    const existingCount = await prisma.productAsset.count({
      where: { projectId: context.params.id },
    });

    const asset = await saveUploadAsset({
      projectId: context.params.id,
      type: input.type,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileBuffer: buffer,
      sortOrder: existingCount,
      isMain: input.type === "MAIN",
    });

    return ok(asset, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
