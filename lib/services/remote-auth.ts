/**
 * 远程验证服务器客户端
 * 当配置了 AUTH_SERVER_URL 时，所有验证请求会转发到中央服务器
 */

import { env } from "@/lib/utils/env";

const AUTH_SERVER_URL = env.AUTH_SERVER_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; status?: number };
}

export interface KeyInfo {
  id: string;
  key: string;
  type: "PER_USE" | "DAILY" | "MONTHLY";
  platform: "DESKTOP_ONLY" | "WEB_ONLY" | "BOTH";
  label: string | null;
  usedCount: number;
  balance: number;
  totalUsedCredits: number;
  activatedAt: string | null;
  expiresAt: string | null;
}

function getBaseUrl(): string {
  return AUTH_SERVER_URL!.replace(/\/$/, "");
}

async function fetchRemote<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  return res.json();
}

export function isRemoteAuthEnabled(): boolean {
  return !!AUTH_SERVER_URL;
}

export async function remoteVerify(key: string, machineId?: string | null, platform?: string | null): Promise<ApiResponse<KeyInfo>> {
  return fetchRemote<KeyInfo>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ key, machineId, platform }),
  });
}

export async function remoteGetMe(key: string, machineId?: string | null, platform?: string | null): Promise<ApiResponse<KeyInfo>> {
  const qs = new URLSearchParams({ key });
  if (machineId) qs.append("machineId", machineId);
  if (platform) qs.append("platform", platform);
  return fetchRemote<KeyInfo>(`/api/auth/me?${qs.toString()}`);
}

export async function remoteConsume(key: string, machineId?: string | null, platform?: string | null): Promise<ApiResponse<KeyInfo>> {
  return fetchRemote<KeyInfo>("/api/auth/consume", {
    method: "POST",
    body: JSON.stringify({ key, machineId, platform }),
  });
}

// Admin APIs (require x-admin-secret header)
export async function remoteListKeys(adminSecret: string): Promise<ApiResponse<KeyInfo[]>> {
  return fetchRemote<KeyInfo[]>("/api/keys", {
    headers: { "x-admin-secret": adminSecret },
  });
}

export async function remoteCreateKeys(
  adminSecret: string,
  params: { type: "PER_USE" | "DAILY" | "MONTHLY"; platform?: "DESKTOP_ONLY" | "WEB_ONLY" | "BOTH"; count: number; label?: string }
): Promise<ApiResponse<KeyInfo[]>> {
  return fetchRemote<KeyInfo[]>("/api/keys", {
    method: "POST",
    headers: { "x-admin-secret": adminSecret },
    body: JSON.stringify(params),
  });
}

export async function remoteDeleteKey(adminSecret: string, id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return fetchRemote<{ deleted: boolean }>(`/api/keys/${id}`, {
    method: "DELETE",
    headers: { "x-admin-secret": adminSecret },
  });
}

export async function remoteGetStats(adminSecret: string): Promise<ApiResponse<{
  total: number;
  activated: number;
  expired: number;
  perUseUsed: number;
}>> {
  return fetchRemote("/api/stats", {
    headers: { "x-admin-secret": adminSecret },
  });
}
