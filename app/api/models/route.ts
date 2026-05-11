import { NextRequest } from "next/server";

import {
  listModelTemplates,
  createModelTemplate,
  deleteModelTemplate,
} from "@/lib/services/model-service";
import { handleRouteError, ok } from "@/lib/utils/route";

export async function GET() {
  try {
    const models = await listModelTemplates();
    return ok(models);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const model = await createModelTemplate({
      name: body.name,
      description: body.description,
      characterPrompt: body.characterPrompt,
      bodyType: body.bodyType,
      heightCm: body.heightCm,
      styleTags: body.styleTags,
      seed: body.seed,
    });
    return ok(model, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("id is required");
    await deleteModelTemplate(id);
    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
