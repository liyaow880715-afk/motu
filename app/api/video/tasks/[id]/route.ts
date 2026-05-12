import { NextRequest } from "next/server";

import { handleRouteError, ok } from "@/lib/utils/route";

const MPT_BASE_URL = process.env.MPT_BASE_URL || "http://localhost:8080";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const taskId = context.params.id;
    const response = await fetch(`${MPT_BASE_URL}/tasks/${taskId}`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`任务查询失败: ${response.status} ${text}`);
    }

    const payload = await response.json();
    return ok(payload.data || payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
