"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, GalleryVerticalEnd, History, Images, KeyRound, LayoutTemplate, LogOut, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { ApiUsageIndicator } from "@/components/layout/api-usage-indicator";
import { FloatingThemeToggle } from "@/components/layout/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/use-auth-store";
import { useBrandStore } from "@/hooks/use-brand-store";

const navItems = [
  { href: "/", label: "快速开始", icon: FolderKanban },
  { href: "/history", label: "历史记录", icon: History },
  { href: "/projects/new", label: "高级创建", icon: GalleryVerticalEnd },
  { href: "/templates", label: "套版中心", icon: LayoutTemplate },
  { href: "/hero-batch", label: "批量主图", icon: Images },
  { href: "/settings/keys", label: "激活码管理", icon: KeyRound },
];

function KeyTypeBadge({ type }: { type: string | undefined }) {
  if (!type) return null;
  const map: Record<string, { label: string; className: string }> = {
    PER_USE: { label: "次卡", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    DAILY: { label: "日卡", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    MONTHLY: { label: "月卡", className: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
  };
  const cfg = map[type] ?? { label: type, className: "" };
  return <Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { keyInfo, clearKey } = useAuthStore();
  const { brandName, companyName, version } = useBrandStore();

  const handleLogout = () => {
    clearKey();
    toast.success("已登出");
    router.replace("/login");
  };

  return (
    <div className="relative z-10 min-h-screen text-slate-900 dark:text-slate-100">
      <div className="fixed bottom-4 left-4 z-[60]">
        <FloatingThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-5 md:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-white/70 bg-white/76 p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b0b0c]/88 dark:shadow-[0_24px_60px_-38px_rgba(0,0,0,0.72)] md:flex md:flex-col">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,245,245,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-black text-base font-semibold tracking-[-0.06em] text-white dark:border-white/10 dark:bg-white dark:text-black">
              M
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{brandName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI 电商详情页生成与编辑工作台</p>
            </div>
          </Link>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200",
                    "text-slate-600 hover:bg-white/85 hover:text-slate-950 hover:shadow-sm",
                    "dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            {keyInfo && (
              <div className="rounded-[1.25rem] border border-white/80 bg-white/68 p-4 dark:border-white/10 dark:bg-[#141416]/88">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyTypeBadge type={keyInfo.type} />
                    {keyInfo.type === "PER_USE" ? (
                      <span className="text-[10px] text-slate-400">
                        {keyInfo.usedCount >= 1 ? "已用完" : "剩余 1 次"}
                      </span>
                    ) : keyInfo.expiresAt ? (
                      <span className="text-[10px] text-slate-400">
                        {new Date(keyInfo.expiresAt) > new Date()
                          ? `有效期至 ${new Date(keyInfo.expiresAt).toLocaleDateString("zh-CN")}`
                          : `已过期 ${new Date(keyInfo.expiresAt).toLocaleDateString("zh-CN")}`}
                      </span>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleLogout} title="登出">
                    <LogOut className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </div>
                <code className="mt-1 block truncate text-[10px] text-slate-500 font-mono">{keyInfo.key}</code>
              </div>
            )}
            <div className="rounded-[2rem] border border-white/80 bg-white/68 p-5 text-slate-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#141416]/88 dark:text-slate-300">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Created By</p>
                  <p className="mt-2 text-sm font-semibold tracking-[0.02em] text-slate-900 dark:text-white">
                    {companyName}
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/8 dark:text-slate-300">
                  {version}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black/30">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">公司</p>
                  <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    零禾（上海）网络科技有限公司
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black/30">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">开发者</p>
                  <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">子圭时安 &amp; AI</p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-6 text-slate-500 dark:text-slate-400">
                面向真实电商详情页工作流打造，从商品分析到规划、生成、编辑与导出，保持模块化与可扩展性。
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 rounded-[2rem] border border-white/80 bg-white/74 p-5 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f0f10]/82 dark:shadow-[0_24px_60px_-38px_rgba(0,0,0,0.78)] md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/monitor/usage"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 gap-2 rounded-2xl border-slate-200 bg-white px-3 shadow-sm hover:bg-white dark:border-white/10 dark:bg-black/30 dark:hover:border-white/20 dark:hover:bg-white/8",
              )}
            >
              <span className="text-sm font-medium">API 监控</span>
              <ApiUsageIndicator />
            </Link>
            <Link href="/settings/providers" className={cn(buttonVariants({ variant: "default" }))}>
              <Settings2 className="mr-2 h-4 w-4" />
              AI 配置
            </Link>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
