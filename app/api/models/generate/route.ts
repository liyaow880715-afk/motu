import { NextRequest } from "next/server";

import { generateModelViews } from "@/lib/services/model-service";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, characterPrompt, seed } = body;

    if (!modelId || !characterPrompt) {
      throw new Error("modelId and characterPrompt are required");
    }

    const results = await generateModelViews({
      modelId,
      characterPrompt,
      seed,
    });

    return ok(results);
  } catch (error) {
    return handleRouteError(error);
  }
}
