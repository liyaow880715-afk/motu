import { NextRequest } from "next/server";

import { editSectionImage } from "@/lib/services/generation-service";
import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";
import { generationRequestSchema } from "@/lib/validations/generation";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function POST(
  request: NextRequest,
  context: { params: { id: string; sectionId: string } },
) {
  try {
    const input = generationRequestSchema.parse(await request.json().catch(() => ({})));
    const accessKey = getAccessKeyFromHeader(request);

    if (accessKey) {
      await checkAndDeductCredits(accessKey);
    }

    try {
      const result = await editSectionImage(context.params.id, context.params.sectionId, {
        preferredModelId: input.modelId,
        referenceAssetIds: input.referenceAssetIds,
        editMode: input.editMode,
      });
      return ok(result);
    } catch (error) {
      if (accessKey) {
        await refundCredits(accessKey);
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
