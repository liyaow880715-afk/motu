import { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { deleteAssetRecord } from "@/lib/storage/asset-manager";
import { handleRouteError, ok } from "@/lib/utils/route";

const removeSchema = z.object({
  assetId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: { id: string; sectionId: string } },
) {
  try {
    const input = removeSchema.parse(await request.json());
    const { id: projectId, sectionId } = context.params;

    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.projectId !== projectId) {
      return handleRouteError(new Error("Section not found"));
    }

    const editableData = (section.editableData ?? {}) as Record<string, unknown>;
    const currentRefs = (editableData.referenceAssetIds as string[] | undefined) ?? [];

    await prisma.pageSection.update({
      where: { id: sectionId },
      data: {
        editableData: {
          ...editableData,
          referenceAssetIds: currentRefs.filter((id) => id !== input.assetId),
        },
      },
    });

    await deleteAssetRecord(input.assetId);

    return ok({ removed: input.assetId });
  } catch (error) {
    return handleRouteError(error);
  }
}
