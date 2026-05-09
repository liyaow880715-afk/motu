"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/hooks/use-auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { setKey } = useAuthStore();
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async () => {
    const key = input.trim();
    if (!key) {
      toast.error("请输入激活码");
      return;
    }

    setVerifying(true);
    try {
      const platform = typeof window !== "undefined" && (window as any).electronAPI ? "desktop" : "web";
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, platform }),
      });
      const data = await res.json();

      if (data.success) {
        setKey(data.data.key, data.data);
        toast.success("激活成功，欢迎回来！");
        router.replace("/");
      } else {
        toast.error(data.error?.message ?? "激活失败");
      }
    } catch {
      toast.error("网络异常，请重试");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center bg-slate-950/80 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-md">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            摹图
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            AI 电商详情页生成与编辑工作台
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-1 text-center">
            <h2 className="text-base font-medium text-white">输入激活码</h2>
            <p className="text-xs text-slate-400">
              请输入您的次卡 / 日卡 / 月卡激活码开始使用
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：BM-XXXXXXXXXXXXXXXX"
                className="h-11 rounded-2xl border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-slate-600 focus-visible:ring-white/20"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={verifying}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={verifying || !input.trim()}
              className="h-11 w-full rounded-2xl text-sm font-medium"
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  验证中...
                </>
              ) : (
                "激活并开始使用"
              )}
            </Button>
          </div>

          <div className="mt-5 flex justify-center gap-5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              次卡
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              日卡
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              月卡
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600">
          没有激活码？请联系管理员获取
        </p>
      </div>
    </div>
  );
}
