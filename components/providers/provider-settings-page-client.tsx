"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ProviderSettings } from "@/components/providers/provider-settings";
import { BrandSettings } from "@/components/settings/brand-settings";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProviderPageData = Array<{
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  maskedApiKey: string;
  purpose: string;
  isActive: boolean;
  updatedAt: string | Date;
  models: Array<{
    modelId: string;
    label: string;
    capabilities: Record<string, unknown>;
    roles: Record<string, unknown>;
    quality?: string | null;
    latency?: string | null;
    cost?: string | null;
    isAvailable: boolean;
    endpointSupport?: {
      imageGeneration: string;
      imageEdit: string;
      note?: string | null;
    };
    isDefaultAnalysis: boolean;
    isDefaultPlanning: boolean;
    isDefaultHeroImage: boolean;
    isDefaultDetailImage: boolean;
    isDefaultImageEdit: boolean;
    isDefaultVideoScript: boolean;
    isDefaultVideoVLM: boolean;
  }>;
}>;

function LoadingState() {
  return (
    <Card>
      <CardContent className="flex min-h-[260px] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载 AI 配置...
      </CardContent>
    </Card>
  );
}

export default function ProviderSettingsPageClient() {
  const [mounted, setMounted] = useState(false);
  const [providers, setProviders] = useState<ProviderPageData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifyingAdmin, setVerifyingAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Desktop: bypass admin gate since it's single-user local app
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !isAdmin) return;

    let aborted = false;

    async function loadProviders() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/providers", {
          cache: "no-store",
          headers: { "x-admin-secret": adminSecret },
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message ?? "加载 AI 配置失败");
        }

        if (!aborted) {
          setProviders(payload.data ?? []);
        }
      } catch (err) {
        if (!aborted) {
          setError(err instanceof Error ? err.message : "加载 AI 配置失败");
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    }

    loadProviders();

    return () => {
      aborted = true;
    };
  }, [mounted, isAdmin, adminSecret]);

  const handleAdminVerify = async () => {
    const secret = adminSecret.trim();
    if (!secret) {
      toast.error("请输入管理员密码");
      return;
    }
    setVerifyingAdmin(true);
    try {
      const res = await fetch("/api/providers", {
        cache: "no-store",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (data.success) {
        setIsAdmin(true);
        setProviders(data.data ?? []);
        toast.success("管理员验证通过");
      } else {
        toast.error(data.error?.message ?? "密码错误");
      }
    } catch {
      toast.error("验证失败");
    } finally {
      setVerifyingAdmin(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-8" suppressHydrationWarning>
        <LoadingState />
      </div>
    );
  }

  // Admin password gate
  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <ShieldCheck className="h-6 w-6 text-slate-300" />
              </div>
              <h2 className="text-base font-medium">管理员验证</h2>
              <p className="text-xs text-muted-foreground">
                请输入管理员密码以管理 AI 配置
              </p>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="管理员密码"
                className="h-11 rounded-2xl pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleAdminVerify()}
              />
            </div>
            <Button onClick={handleAdminVerify} disabled={verifyingAdmin} className="w-full h-11 rounded-2xl">
              {verifyingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : "验证并进入"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <PageHeader
          eyebrow="模型服务配置"
          title="Provider 与模型配置中心"
          description="页面会优先展示已保存的历史服务与模型快照，方便你快速切换。需要从当前代理商重新发现模型并探测能力时，再点击&quot;发现模型并探测&quot;。"
        />
        <Button variant="outline" size="sm" onClick={() => { setIsAdmin(false); setAdminSecret(""); }}>
          退出管理
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Card>
          <CardContent className="min-h-[180px] space-y-2 pt-6 text-sm">
            <p className="font-medium text-destructive">加载失败</p>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <ProviderSettings initialProviders={providers} adminSecret={adminSecret} />
      )}

      <BrandSettings />
    </div>
  );
}
