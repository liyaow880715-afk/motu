import { NextRequest } from "next/server";

import { generateModelViews } from "@/lib/services/model-service";
import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, characterPrompt, seed } = body;

    if (!modelId || !characterPrompt) {
      throw new Error("modelId and characterPrompt are required");
    }

    const accessKey = getAccessKeyFromHeader(request);

    if (accessKey) {
      await checkAndDeductCredits(accessKey);
    }

    try {
      const results = await generateModelViews({
        modelId,
        characterPrompt,
        seed,
      });

      return ok(results);
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
