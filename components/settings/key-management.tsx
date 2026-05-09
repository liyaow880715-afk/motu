"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Loader2, Plus, Trash2, RefreshCw, ShieldCheck, Lock, KeyRound, Activity, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface AccessKeyItem {
  id: string;
  key: string;
  type: "PER_USE" | "DAILY" | "MONTHLY";
  platform: "DESKTOP_ONLY" | "WEB_ONLY" | "BOTH";
  label: string | null;
  usedCount: number;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function KeyManagement() {
  const [adminSecret, setAdminSecret] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifyingAdmin, setVerifyingAdmin] = useState(false);

  const [keys, setKeys] = useState<AccessKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    activated: 0,
    expired: 0,
    perUseUsed: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [newType, setNewType] = useState<"PER_USE" | "DAILY" | "MONTHLY">("PER_USE");
  const [newPlatform, setNewPlatform] = useState<"DESKTOP_ONLY" | "WEB_ONLY" | "BOTH">("BOTH");
  const [newCount, setNewCount] = useState(1);
  const [newLabel, setNewLabel] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch("/api/keys", {
        headers: { "x-admin-secret": adminSecret },
      });
      const data = await res.json();
      if (data.success) {
        setKeys(data.data);
      } else {
        throw new Error(data.error?.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, adminSecret]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setStatsLoading(true);
    try {
      const res = await fetch("/api/keys/stats", {
        headers: { "x-admin-secret": adminSecret },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // silently fail stats
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin, adminSecret]);

  useEffect(() => {
    if (isAdmin) {
      fetchKeys();
      fetchStats();
    }
  }, [isAdmin, fetchKeys, fetchStats]);

  const handleAdminVerify = async () => {
    const secret = adminSecret.trim();
    if (!secret) {
      toast.error("请输入管理员密码");
      return;
    }
    setVerifyingAdmin(true);
    try {
      const res = await fetch("/api/keys", {
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (data.success) {
        setIsAdmin(true);
        setKeys(data.data);
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

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          type: newType,
          platform: newPlatform,
          count: newCount,
          label: newLabel || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`成功生成 ${data.data.length} 个激活码`);
        setNewLabel("");
        setNewCount(1);
        fetchKeys();
      } else {
        throw new Error(data.error?.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/keys/${pendingDeleteId}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminSecret },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("已删除");
        fetchKeys();
      } else {
        throw new Error(data.error?.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("已复制到剪贴板");
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "PER_USE":
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">次卡</Badge>;
      case "DAILY":
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">日卡</Badge>;
      case "MONTHLY":
        return <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/20">月卡</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const platformBadge = (platform: string) => {
    switch (platform) {
      case "DESKTOP_ONLY":
        return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20">客户端</Badge>;
      case "WEB_ONLY":
        return <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/20">网页端</Badge>;
      case "BOTH":
        return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/20">通用</Badge>;
      default:
        return <Badge>{platform}</Badge>;
    }
  };

  const statusBadge = (k: AccessKeyItem) => {
    if (k.expiresAt && new Date() > new Date(k.expiresAt)) {
      return <Badge variant="outline" className="text-red-400 border-red-400/30">已过期</Badge>;
    }
    if (k.type === "PER_USE" && k.usedCount >= 1) {
      return <Badge variant="outline" className="text-amber-400 border-amber-400/30">已用完</Badge>;
    }
    if (k.activatedAt) {
      return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">已激活</Badge>;
    }
    return <Badge variant="outline" className="text-slate-400">未使用</Badge>;
  };

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
                请输入管理员密码以管理激活码
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="激活码管理" description="创建、查看和管理次卡 / 日卡 / 月卡激活码" />
        <Button variant="outline" size="sm" onClick={() => { setIsAdmin(false); setAdminSecret(""); }}>
          退出管理
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
              <KeyRound className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <div className="text-xl font-semibold">{statsLoading ? "-" : stats.total}</div>
              <div className="text-[11px] text-muted-foreground">总激活码</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-semibold">{statsLoading ? "-" : stats.activated}</div>
              <div className="text-[11px] text-muted-foreground">已激活</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
              <Clock className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-xl font-semibold">{statsLoading ? "-" : stats.expired}</div>
              <div className="text-[11px] text-muted-foreground">已过期</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xl font-semibold">{statsLoading ? "-" : stats.perUseUsed}</div>
              <div className="text-[11px] text-muted-foreground">次卡已用</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-sm font-medium">生成新激活码</h3>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label className="text-xs">类型</Label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "PER_USE" | "DAILY" | "MONTHLY")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="PER_USE">次卡</option>
                <option value="DAILY">日卡</option>
                <option value="MONTHLY">月卡</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">适用平台</Label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as "DESKTOP_ONLY" | "WEB_ONLY" | "BOTH")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="BOTH">通用</option>
                <option value="DESKTOP_ONLY">仅客户端</option>
                <option value="WEB_ONLY">仅网页端</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">数量</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newCount}
                onChange={(e) => setNewCount(Number(e.target.value))}
                className="h-10"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">备注（可选）</Label>
              <div className="flex gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="例如：客户A-月卡"
                  className="h-10"
                />
                <Button onClick={handleCreate} disabled={creating} className="h-10 shrink-0">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  生成
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h3 className="text-sm font-medium">激活码列表（{keys.length}）</h3>
            <Button variant="ghost" size="sm" onClick={fetchKeys} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无激活码，请上方生成
            </div>
          ) : (
            <div className="divide-y">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{k.key}</code>
                      {typeBadge(k.type)}
                      {platformBadge(k.platform)}
                      {statusBadge(k)}
                      {k.label && <span className="text-xs text-muted-foreground">{k.label}</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {k.activatedAt ? (
                        <>
                          激活于 {new Date(k.activatedAt).toLocaleString("zh-CN")}
                          {k.expiresAt && (
                            <> · 过期于 {new Date(k.expiresAt).toLocaleString("zh-CN")}</>
                          )}
                        </>
                      ) : (
                        <>创建于 {new Date(k.createdAt).toLocaleString("zh-CN")} · 未激活</>
                      )}
                      {k.type === "PER_USE" && <> · 已使用 {k.usedCount} 次</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopy(k.key)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-500" onClick={() => handleDelete(k.id)} title="删除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="删除激活码"
        description="此操作不可恢复，激活码删除后将无法使用。"
        confirmText="确认删除"
        cancelText="取消"
        destructive
        loading={deleting}
        icon={<Trash2 className="h-5 w-5" />}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
