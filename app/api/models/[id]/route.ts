import { NextRequest } from "next/server";

import { getModelTemplate } from "@/lib/services/model-service";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const model = await getModelTemplate(context.params.id);
    return ok(model);
  } catch (error) {
    return handleRouteError(error);
  }
}
