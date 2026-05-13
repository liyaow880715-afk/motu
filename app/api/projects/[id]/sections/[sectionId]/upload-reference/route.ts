import { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { saveUploadAsset } from "@/lib/storage/asset-manager";
import { handleRouteError, ok, fail } from "@/lib/utils/route";

const MAX_BASE64_SIZE = 20 * 1024 * 1024; // 20MB raw limit

const uploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: { id: string; sectionId: string } },
) {
  try {
    const input = uploadSchema.parse(await request.json());
    const buffer = Buffer.from(input.base64Data, "base64");
    if (buffer.byteLength > MAX_BASE64_SIZE) {
      return fail("FILE_TOO_LARGE", `文件大小超过限制 (${(MAX_BASE64_SIZE / 1024 / 1024).toFixed(0)}MB)`, null, 413);
    }

    const { id: projectId, sectionId } = context.params;

    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      return handleRouteError(new Error("Section not found"));
    }

    const existingCount = await prisma.productAsset.count({
      where: { projectId },
    });

    const asset = await saveUploadAsset({
      projectId,
      type: "REFERENCE",
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileBuffer: buffer,
      sortOrder: existingCount,
      isMain: false,
    });

    const editableData = (section.editableData ?? {}) as Record<string, unknown>;
    const currentRefs = (editableData.referenceAssetIds as string[] | undefined) ?? [];

    await prisma.pageSection.update({
      where: { id: sectionId },
      data: {
        editableData: {
          ...editableData,
          referenceAssetIds: [...currentRefs, asset.id],
        },
      },
    });

    return ok(asset, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
