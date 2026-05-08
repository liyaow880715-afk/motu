import { z } from "zod";
import { NextRequest } from "next/server";

import {
  activateProviderConfig,
  getAllProviderConfigs,
  resolveProviderConnectionInput,
  saveProviderConfig,
} from "@/lib/services/provider-service";
import { providerSaveSchema } from "@/lib/validations/provider";
import { checkAdminOrDesktop } from "@/lib/utils/admin-check";
import { handleRouteError, ok, fail } from "@/lib/utils/route";

const providerActivateSchema = z.object({
  providerId: z.string().min(1, "请选择要切换的历史服务"),
});

export async function GET(request: NextRequest) {
  try {
    if (!checkAdminOrDesktop(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }
    const providers = await getAllProviderConfigs();
    return ok(providers);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAdminOrDesktop(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }
    const parsed = providerSaveSchema.parse(await request.json());
    const resolved = await resolveProviderConnectionInput(parsed);
    const savedProviderId = await saveProviderConfig({
      ...parsed,
      apiKey: resolved.apiKey,
    });
    const providers = await getAllProviderConfigs();
    return ok({
      savedProviderId,
      providers,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!checkAdminOrDesktop(request)) {
      return fail("UNAUTHORIZED", "管理员密码错误", null, 403);
    }
    const parsed = providerActivateSchema.parse(await request.json());
    const providers = await activateProviderConfig(parsed.providerId);
    return ok(providers);
  } catch (error) {
    return handleRouteError(error);
  }
}
