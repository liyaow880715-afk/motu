"use client";

import { useAuthStore } from "@/hooks/use-auth-store";

export function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = "application/json";
  }
  const key = useAuthStore.getState().key;
  if (key) {
    headers["x-access-key"] = key;
  }
  return headers;
}

export async function fetchWithAuth(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(false),
    ...(options?.headers ?? {}),
  };
  return fetch(url, {
    ...options,
    headers,
  });
}
