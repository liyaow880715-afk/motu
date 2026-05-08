import { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { deleteProject, getProjectDetail, updateProject } from "@/lib/services/project-service";
import { projectUpdateSchema } from "@/lib/validations/project";
import { fail, handleRouteError, ok } from "@/lib/utils/route";
import { env } from "@/lib/utils/env";

function getAccessKeyFromHeader(request: NextRequest): string | undefined {
  // Desktop: local SQLite is single-user, don't isolate by access key
  if (env.APP_RUNTIME === "desktop") return undefined;
  return request.headers.get("x-access-key") ?? undefined;
}

async function verifyProjectOwnership(projectId: string, accessKey: string | undefined) {
  // Desktop: local SQLite is single-user, bypass ownership check
  if (env.APP_RUNTIME === "desktop") return true;
  if (!accessKey) return false;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { accessKeyId: true },
  });
  if (!project) return false;
  // Allow if project has no owner (legacy) or matches the key
  if (!project.accessKeyId) return true;
  return project.accessKeyId === accessKey;
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const accessKey = getAccessKeyFromHeader(request);
    const owned = await verifyProjectOwnership(context.params.id, accessKey);
    if (!owned) {
      return fail("FORBIDDEN", "无权访问该项目", null, 403);
    }

    const project = await getProjectDetail(context.params.id);
    if (!project) {
      return fail("NOT_FOUND", "Project not found.", null, 404);
    }
    return ok(project);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const accessKey = getAccessKeyFromHeader(request);
    const owned = await verifyProjectOwnership(context.params.id, accessKey);
    if (!owned) {
      return fail("FORBIDDEN", "无权访问该项目", null, 403);
    }

    const input = projectUpdateSchema.parse(await request.json());
    const project = await updateProject(context.params.id, input);
    return ok(project);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const accessKey = getAccessKeyFromHeader(request);
    const owned = await verifyProjectOwnership(context.params.id, accessKey);
    if (!owned) {
      return fail("FORBIDDEN", "无权访问该项目", null, 403);
    }

    const project = await deleteProject(context.params.id);
    if (!project) {
      return fail("NOT_FOUND", "Project not found.", null, 404);
    }
    return ok(project);
  } catch (error) {
    return handleRouteError(error);
  }
}
