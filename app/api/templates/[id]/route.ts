import { NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteTemplate,
  getTemplateById,
  updateTemplate,
} from "@/lib/services/template-service";
import { handleRouteError, ok } from "@/lib/utils/route";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  structureJson: z.record(z.string(), z.unknown()).optional(),
  styleProfile: z.record(z.string(), z.unknown()).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const template = await getTemplateById(id);
    if (!template) {
      return handleRouteError(new Error("模板不存在"));
    }
    return ok({ template });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = updateSchema.parse(await request.json());
    const template = await updateTemplate(id, parsed as any);
    return ok({ template });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteTemplate(id);
    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
