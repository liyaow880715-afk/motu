import { NextRequest } from "next/server";
import { z } from "zod";

import { analyzeProject } from "@/lib/services/analysis-service";
import { checkAndDeductCredits, refundCredits } from "@/lib/services/credit-service";
import { getAccessKeyFromHeader } from "@/lib/utils/auth";
import { handleRouteError, ok } from "@/lib/utils/route";

const analyzeRequestSchema = z.object({
  modelId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const input = analyzeRequestSchema.parse(await request.json().catch(() => ({})));
    const accessKey = getAccessKeyFromHeader(request);

    if (accessKey) {
      await checkAndDeductCredits(accessKey);
    }

    try {
      const analysis = await analyzeProject(context.params.id, input.modelId);
      return ok(analysis);
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
