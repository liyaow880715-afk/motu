import { NextRequest } from "next/server";
import { env } from "@/lib/utils/env";

export function checkAdmin(request: NextRequest): boolean {
  const secret = request.headers.get("x-admin-secret");
  return !!secret && secret === env.ADMIN_SECRET;
}

/** For desktop builds, bypass admin check since it's single-user local app */
export function checkAdminOrDesktop(_request: NextRequest): boolean {
  if (env.APP_RUNTIME === "desktop") return true;
  const secret = _request.headers.get("x-admin-secret");
  return !!secret && secret === env.ADMIN_SECRET;
}
