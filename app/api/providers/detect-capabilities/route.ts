import { NextRequest } from "next/server";
import { z } from "zod";

import { normalizeDetectedModels } from "@/lib/ai/capability-detector";
import { discoverProviderModels } from "@/lib/services/provider-service";
import { providerInputSchema } from "@/lib/validations/provider";
import { checkAdmin } from "@/lib/utils/admin-check";
import { handleRouteError, ok, fail } from "@/lib/utils/route";

const detectSchema = z.union([
  providerInputSchema,
  z.object({
    models: z.array(
      z.object({
        id: z.string(),
        label: z.string().optional(),
      }),
    ),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }
    const input = detectSchema.parse(await request.json());
    const result =
      "models" in input
        ? { models: normalizeDetectedModels(input.models) }
        : await discoverProviderModels(input);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
