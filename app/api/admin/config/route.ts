import { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/utils/env";
import { handleRouteError, ok, fail } from "@/lib/utils/route";
import { getCreditCost, setCreditCost } from "@/lib/services/config-service";

function checkAdmin(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== env.ADMIN_SECRET) {
    return false;
  }
  return true;
}

const patchSchema = z.object({
  creditCostPerCall: z.number().int().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }

    const cost = await getCreditCost();
    return ok({ creditCostPerCall: cost });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }

    const parsed = patchSchema.parse(await request.json());

    if (parsed.creditCostPerCall !== undefined) {
      await setCreditCost(parsed.creditCostPerCall);
    }

    const cost = await getCreditCost();
    return ok({ creditCostPerCall: cost });
  } catch (error) {
    return handleRouteError(error);
  }
}
