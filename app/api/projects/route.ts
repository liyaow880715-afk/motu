import { NextRequest } from "next/server";

import { createProject, listProjects } from "@/lib/services/project-service";
import { projectCreateSchema } from "@/lib/validations/project";
import { handleRouteError, ok } from "@/lib/utils/route";
import { env } from "@/lib/utils/env";

function getAccessKeyFromHeader(request: NextRequest): string | undefined {
  // Desktop: local SQLite is single-user, don't isolate by access key
  if (env.APP_RUNTIME === "desktop") return undefined;
  return request.headers.get("x-access-key") ?? undefined;
}

export async function GET(request: NextRequest) {
  try {
    const accessKey = getAccessKeyFromHeader(request);
    const projects = await listProjects(accessKey);
    return ok(projects);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = projectCreateSchema.parse(await request.json());
    const accessKey = getAccessKeyFromHeader(request);
    const project = await createProject(input, accessKey);
    return ok(project, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
