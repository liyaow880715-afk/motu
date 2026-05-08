"use client";

import { useEffect } from "react";

export function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();

      if (url.startsWith("/api/")) {
        const key = localStorage.getItem("bm_access_key");
        if (key) {
          const headers = new Headers(init?.headers);
          headers.set("x-access-key", key);
          return originalFetch(input, { ...init, headers });
        }
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
