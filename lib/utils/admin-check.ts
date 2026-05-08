import { NextRequest } from "next/server";
import { env } from "@/lib/utils/env";

export function checkAdmin(request: NextRequest): boolean {
  const secret = request.headers.get("x-admin-secret");
  return !!secret && secret === env.ADMIN_SECRET;
}
