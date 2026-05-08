"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth-store";

const PUBLIC_PATHS = ["/login", "/settings/keys", "/settings/providers"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth, isLoading, isLoggedIn } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    checkAuth().then((valid) => {
      setChecked(true);

      const isPublic = PUBLIC_PATHS.includes(pathname);

      if (!valid && !isPublic) {
        router.replace("/login");
      } else if (valid && isPublic) {
        router.replace("/");
      }
    });
  }, [checkAuth, pathname, router]);

  // Route guard: if already checked and logged out, redirect on protected pages
  useEffect(() => {
    if (!checked) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!isLoggedIn && !isPublic) {
      router.replace("/login");
    }
  }, [checked, isLoggedIn, pathname, router]);

  // Show spinner only on first load while checking auth
  if (!checked && isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return <>{children}</>;
}
