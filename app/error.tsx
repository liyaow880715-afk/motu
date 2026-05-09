"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
        页面出现了一些问题
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {error.message || "加载内容时发生了意外错误，请尝试刷新页面。"}
      </p>
      {error.digest && (
        <code className="mt-3 inline-block rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground">
          Error ID: {error.digest}
        </code>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="outline" className="rounded-xl">
          <RotateCcw className="mr-2 h-4 w-4" />
          重试
        </Button>
        <Button onClick={() => window.location.reload()} className="rounded-xl">
          刷新页面
        </Button>
      </div>
    </div>
  );
}
