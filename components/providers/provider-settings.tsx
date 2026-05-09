"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronsUpDown,
  CopyPlus,
  History,
  Loader2,
  Plus,
  PlugZap,
  Save,
  Search,
  X,
} from "lucide-react";
import { z } from "zod";

import { providerSaveSchema } from "@/lib/validations/provider";
import { capabilityLabels } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProviderFormValues = z.input<typeof providerSaveSchema>;

type ProviderModelRecord = {
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
};

type ProviderRecord = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  maskedApiKey: string;
  purpose: string;
  isActive: boolean;
  updatedAt: string | Date;
  models: ProviderModelRecord[];
};

interface ProviderSettingsProps {
  initialProviders: ProviderRecord[];
  adminSecret?: string;
}

type DefaultAssignments = {
  analysisModelId: string;
  planningModelId: string;
  heroImageModelId: string;
  detailImageModelId: string;
  imageEditModelId: string;
};

type GenericModelRecord = Record<string, any>;

const roleFieldLabels: Array<[keyof DefaultAssignments, string]> = [
  ["analysisModelId", "文本模型（分析 + 规划）"],
  ["heroImageModelId", "图片模型（头图 + 详情 + 编辑）"],
];

const secondaryAssignments: Record<string, Array<keyof DefaultAssignments>> = {
  analysisModelId: ["planningModelId"],
  heroImageModelId: ["detailImageModelId", "imageEditModelId"],
};

function buildDefaults(provider: ProviderRecord | null): DefaultAssignments {
  return {
    analysisModelId: provider?.models.find((item) => item.isDefaultAnalysis)?.modelId ?? "",
    planningModelId: provider?.models.find((item) => item.isDefaultPlanning)?.modelId ?? "",
    heroImageModelId: provider?.models.find((item) => item.isDefaultHeroImage)?.modelId ?? "",
    detailImageModelId: provider?.models.find((item) => item.isDefaultDetailImage)?.modelId ?? "",
    imageEditModelId: provider?.models.find((item) => item.isDefaultImageEdit)?.modelId ?? "",
  };
}

function getEndpointBadge(status: string) {
  if (status === "available") {
    return { text: "真实端点可用", variant: "success" as const };
  }
  if (status === "rate_limited") {
    return { text: "接口限流中", variant: "warning" as const };
  }
  if (status === "unavailable") {
    return { text: "真实端点不可用", variant: "destructive" as const };
  }
  if (status === "not_applicable") {
    return { text: "不适用", variant: "outline" as const };
  }
  return { text: "待确认", variant: "outline" as const };
}

function canUseForRole(model: GenericModelRecord, roleKey: keyof DefaultAssignments) {
  if (roleKey === "analysisModelId" || roleKey === "planningModelId") {
    return Boolean(model.capabilities?.text);
  }

  if (roleKey === "heroImageModelId" || roleKey === "detailImageModelId" || roleKey === "imageEditModelId") {
    return Boolean(model.capabilities?.image_gen) && model.capabilities?.real_image_gen !== false;
  }

  return true;
}

function formatTimeLabel(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ProviderConfigPanel({
  purpose,
  purposeLabel,
  purposeDescription,
  allProviders,
  onProvidersChange,
  adminSecret,
}: {
  purpose: "text" | "image";
  purposeLabel: string;
  purposeDescription: string;
  allProviders: ProviderRecord[];
  onProvidersChange: (providers: ProviderRecord[]) => void;
  adminSecret?: string;
}) {
  const purposeProviders = useMemo(
    () => allProviders.filter((p) => p.purpose === purpose),
    [allProviders, purpose],
  );
  const activeProvider = useMemo(
    () => purposeProviders.find((item) => item.isActive) ?? purposeProviders[0] ?? null,
    [purposeProviders],
  );

  const [selectedProviderId, setSelectedProviderId] = useState(activeProvider?.id ?? "");
  const [loading, setLoading] = useState<null | "test" | "discover" | "save" | "saveAsNew">(null);
  const [switchingProviderId, setSwitchingProviderId] = useState<string | null>(null);

  const selectedProvider = useMemo(
    () => purposeProviders.find((item) => item.id === selectedProviderId) ?? activeProvider,
    [purposeProviders, selectedProviderId, activeProvider],
  );

  const [models, setModels] = useState<Array<GenericModelRecord>>(selectedProvider?.models ?? []);
  const [defaults, setDefaults] = useState<DefaultAssignments>(buildDefaults(selectedProvider ?? null));
  const [isAddingManualModel, setIsAddingManualModel] = useState(false);
  const [manualModelId, setManualModelId] = useState("");
  const [manualModelLabel, setManualModelLabel] = useState("");
  const [manualCapabilities, setManualCapabilities] = useState<Record<string, boolean>>({});

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSaveSchema),
    defaultValues: {
      id: selectedProvider?.id ?? undefined,
      name: selectedProvider?.name ?? `${purposeLabel}服务`,
      baseUrl: selectedProvider?.baseUrl ?? (purpose === "text" ? "https://api.kimi.com/coding/v1" : ""),
      apiKey: selectedProvider?.apiKey ?? "",
      purpose,
      isActive: true,
      defaultAssignments: undefined,
    },
  });

  useEffect(() => {
    const nextProvider = selectedProvider ?? null;
    setModels(nextProvider?.models ?? []);
    setDefaults(buildDefaults(nextProvider));
    setIsAddingManualModel(false);
    setManualModelId("");
    setManualModelLabel("");
    setManualCapabilities({});
    form.reset({
      id: nextProvider?.id ?? undefined,
      name: nextProvider?.name ?? `${purposeLabel}服务`,
      baseUrl: nextProvider?.baseUrl ?? (purpose === "text" ? "https://api.kimi.com/coding/v1" : ""),
      apiKey: nextProvider?.apiKey ?? "",
      purpose,
      isActive: true,
      defaultAssignments: undefined,
    });
  }, [selectedProvider, form, purpose, purposeLabel]);

  const availableImageModels = useMemo(
    () => models.filter((model) => model.capabilities?.image_gen && model.capabilities?.real_image_gen !== false),
    [models],
  );

  const relevantRoleField = purpose === "text" ? "analysisModelId" : "heroImageModelId";
  const relevantRoleLabel = purpose === "text" ? "文本模型（分析 + 规划）" : "图片模型（头图 + 详情 + 编辑）";

  async function handleActivateProvider(providerId: string) {
    setSwitchingProviderId(providerId);
    try {
      const response = await fetch("/api/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(adminSecret ? { "x-admin-secret": adminSecret } : {}) },
        body: JSON.stringify({ providerId }),
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message ?? "切换服务失败");
      }
      onProvidersChange(payload.data ?? []);
      toast.success("已切换为当前服务");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "切换服务失败");
    } finally {
      setSwitchingProviderId(null);
    }
  }

  const handleTest = form.handleSubmit(async (values) => {
    setLoading("test");
    try {
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminSecret ? { "x-admin-secret": adminSecret } : {}) },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message ?? "连接测试失败");
      }
      toast.success(`${purposeLabel}连接成功`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "连接测试失败");
    } finally {
      setLoading(null);
    }
  });

  const handleDiscover = form.handleSubmit(async (values) => {
    setLoading("discover");
    try {
      const response = await fetch("/api/providers/discover-models", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminSecret ? { "x-admin-secret": adminSecret } : {}) },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message ?? "模型发现失败");
      }
      setModels(payload.data.models);
      setDefaults(payload.data.recommendations);
      toast.success(`已发现 ${payload.data.models.length} 个模型`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "模型发现失败");
    } finally {
      setLoading(null);
    }
  });

  function handleAddManualModel() {
    const id = manualModelId.trim();
    if (!id) {
      toast.error("请输入模型 ID");
      return;
    }
    if (models.some((m) => m.modelId === id)) {
      toast.error("该模型已存在");
      return;
    }

    const caps: Record<string, unknown> = {};
    const defaultCaps = [
      { key: "text", defaultOn: purpose === "text" },
      { key: "vision", defaultOn: purpose === "text" },
      { key: "structured_output", defaultOn: purpose === "text" },
      { key: "image_gen", defaultOn: purpose === "image" },
      { key: "image_edit", defaultOn: false },
    ];
    defaultCaps.forEach((cap) => {
      const isEnabled = manualCapabilities[cap.key] ?? cap.defaultOn;
      if (isEnabled) caps[cap.key] = true;
    });

    const newModel: GenericModelRecord = {
      modelId: id,
      label: manualModelLabel.trim() || id,
      capabilities: caps,
      roles: {},
      isAvailable: true,
      endpointSupport: {
        imageGeneration: caps.image_gen ? "unknown" : "not_applicable",
        imageEdit: caps.image_edit ? "unknown" : "not_applicable",
        note: "手动添加的模型，未经过端点探测",
      },
    };

    const nextModels = [...models, newModel];
    setModels(nextModels);

    // Auto-select as default if this is the first model
    setDefaults((current) => {
      const next = { ...current };
      if (!next[relevantRoleField] && canUseForRole(newModel, relevantRoleField)) {
        next[relevantRoleField] = id;
        const secondaries = secondaryAssignments[relevantRoleField];
        if (secondaries) {
          secondaries.forEach((secondaryKey) => {
            next[secondaryKey] = id;
          });
        }
      }
      return next;
    });

    setManualModelId("");
    setManualModelLabel("");
    setManualCapabilities({});
    setIsAddingManualModel(false);
    toast.success(`已手动添加模型：${newModel.label}`);
  }

  async function saveProvider(overwriteExisting: boolean) {
    return form.handleSubmit(async (values) => {
      setLoading(overwriteExisting ? "save" : "saveAsNew");
      try {
        const response = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(adminSecret ? { "x-admin-secret": adminSecret } : {}) },
          body: JSON.stringify({
            ...values,
            id: overwriteExisting ? values.id : undefined,
            purpose,
            defaultAssignments: defaults,
            models,
          }),
        });
        const payload = await response.json();
        if (!payload.success) {
          throw new Error(payload.error?.message ?? "配置保存失败");
        }

        onProvidersChange(payload.data?.providers ?? []);
        const savedId = payload.data?.savedProviderId ?? values.id ?? "";
        setSelectedProviderId(savedId);
        toast.success(overwriteExisting ? "服务配置已保存" : "已另存为新服务");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "配置保存失败");
      } finally {
        setLoading(null);
      }
    })();
  }

  return (
    <div className="space-y-5">
      {/* History selector */}
      <div className="space-y-3 rounded-3xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">快捷读取已保存服务</h3>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1 space-y-2">
            <Label htmlFor={`provider-history-${purpose}`}>历史服务</Label>
            <div className="relative">
              <select
                id={`provider-history-${purpose}`}
                className="flex h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-10 text-sm text-foreground dark:bg-black/30"
                value={selectedProviderId}
                onChange={(event) => setSelectedProviderId(event.target.value)}
              >
                {purposeProviders.length === 0 ? <option value="">暂无已保存服务</option> : null}
                {purposeProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} · {provider.baseUrl}
                  </option>
                ))}
              </select>
              <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => selectedProviderId && setSelectedProviderId(selectedProviderId)}
              disabled={!selectedProviderId}
            >
              读取到表单
            </Button>
            <Button
              type="button"
              variant={selectedProvider?.isActive ? "secondary" : "default"}
              onClick={() => selectedProviderId && handleActivateProvider(selectedProviderId)}
              disabled={!selectedProviderId || selectedProvider?.isActive || switchingProviderId !== null}
            >
              {switchingProviderId === selectedProviderId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {selectedProvider?.isActive ? "当前使用中" : "切换为当前服务"}
            </Button>
          </div>
        </div>
        {selectedProvider ? (
          <div className="rounded-2xl border border-border bg-background p-4 dark:bg-black/20">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{selectedProvider.name}</p>
              {selectedProvider.isActive ? <Badge variant="success">当前服务</Badge> : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{selectedProvider.baseUrl}</p>
            <p className="mt-1 text-xs text-muted-foreground">Key：{selectedProvider.maskedApiKey || "未显示"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              最近更新：{formatTimeLabel(selectedProvider.updatedAt)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
            <PlugZap className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">还没有保存过{purposeLabel}配置</p>
            <p className="mt-1 text-xs text-muted-foreground">首次保存后，这里就可以直接读取并快捷切换</p>
          </div>
        )}
      </div>

      {/* Form */}
      <form autoComplete="off" className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor={`provider-name-${purpose}`}>服务名称</Label>
          <Input
            id={`provider-name-${purpose}`}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder={`例如：${purpose === "text" ? "Kimi / DeepSeek" : "OpenAI / 硅基流动"}`}
            {...form.register("name")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`provider-base-url-${purpose}`}>baseURL</Label>
          <Input
            id={`provider-base-url-${purpose}`}
            inputMode="url"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder={purpose === "text" ? "https://api.kimi.com/coding/v1" : "https://api.openai.com/v1"}
            {...form.register("baseUrl")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`provider-api-key-${purpose}`}>API Key</Label>
          <Input
            id={`provider-api-key-${purpose}`}
            type="password"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder="可留空；系统会自动复用当前服务已保存的 API Key"
            {...form.register("apiKey")}
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={handleTest} disabled={loading !== null}>
          {loading === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
          测试连接
        </Button>
        <Button type="button" variant="secondary" onClick={handleDiscover} disabled={loading !== null}>
          {loading === "discover" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          发现模型
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAddingManualModel((v) => !v)}
          disabled={loading !== null}
        >
          <Plus className="mr-2 h-4 w-4" />
          手动添加模型
        </Button>
        <Button type="button" onClick={() => saveProvider(true)} disabled={loading !== null || models.length === 0}>
          {loading === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {selectedProvider ? "覆盖保存" : "保存配置"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => saveProvider(false)}
          disabled={loading !== null || models.length === 0}
        >
          {loading === "saveAsNew" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CopyPlus className="mr-2 h-4 w-4" />
          )}
          另存为新服务
        </Button>
      </div>

      {/* Manual model add form */}
      {isAddingManualModel ? (
        <div className="space-y-4 rounded-3xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">手动添加模型</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingManualModel(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor={`manual-model-id-${purpose}`}>模型 ID</Label>
              <Input
                id={`manual-model-id-${purpose}`}
                placeholder={purpose === "text" ? "moonshot-v1-128k" : "dall-e-3"}
                value={manualModelId}
                onChange={(e) => setManualModelId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`manual-model-label-${purpose}`}>显示名称（可选）</Label>
              <Input
                id={`manual-model-label-${purpose}`}
                placeholder={manualModelId || "默认使用模型 ID"}
                value={manualModelLabel}
                onChange={(e) => setManualModelLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>能力标签</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "text", label: "文本", defaultOn: purpose === "text" },
                  { key: "vision", label: "视觉理解", defaultOn: purpose === "text" },
                  { key: "structured_output", label: "结构化输出", defaultOn: purpose === "text" },
                  { key: "image_gen", label: "图像生成", defaultOn: purpose === "image" },
                  { key: "image_edit", label: "图像编辑", defaultOn: false },
                ].map((cap) => (
                  <button
                    key={cap.key}
                    type="button"
                    onClick={() => {
                      setManualCapabilities((prev) => ({
                        ...prev,
                        [cap.key]: !prev[cap.key],
                      }));
                    }}
                    className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                      (manualCapabilities[cap.key] ?? cap.defaultOn)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {(manualCapabilities[cap.key] ?? cap.defaultOn) ? "✓ " : ""}
                    {cap.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="button" onClick={handleAddManualModel} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              确认添加
            </Button>
          </div>
        </div>
      ) : null}

      {/* Model assignment */}
      {models.length > 0 ? (
        <div className="space-y-4 rounded-3xl bg-muted/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">默认模型角色</h3>
            <Badge>{models.length} 个模型</Badge>
          </div>

          {purpose === "image" && availableImageModels.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              当前 Provider 尚未探测到可用于真实出图的模型，图片生成会被禁用。
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>{relevantRoleLabel}</Label>
            <select
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground dark:bg-black/30"
              value={defaults[relevantRoleField] ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setDefaults((current) => {
                  const next = { ...current, [relevantRoleField]: value };
                  const secondaries = secondaryAssignments[relevantRoleField];
                  if (secondaries) {
                    secondaries.forEach((secondaryKey) => {
                      next[secondaryKey] = value;
                    });
                  }
                  return next;
                });
              }}
            >
              <option value="">未选择</option>
              {models.map((model) => {
                const disabled = !canUseForRole(model, relevantRoleField);
                const unavailableSuffix =
                  relevantRoleField === "heroImageModelId" && disabled ? "（不适合作为真实图片默认模型）" : "";

                return (
                  <option key={model.modelId} value={model.modelId} disabled={disabled}>
                    {model.label}
                    {unavailableSuffix}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      ) : null}

      {/* Model capability display */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm">模型能力</h3>
        {models.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            先测试并发现模型，系统会在这里展示能力标签和端点探测结果。
          </div>
        ) : (
          models.map((model) => {
            const imageGenBadge = getEndpointBadge(model.endpointSupport?.imageGeneration ?? "unknown");
            const imageEditBadge = getEndpointBadge(model.endpointSupport?.imageEdit ?? "unknown");

            return (
              <div key={model.modelId} className="rounded-2xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{model.label}</p>
                    <p className="text-xs text-muted-foreground">{model.modelId}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(model.capabilities ?? {})
                      .filter(([capability, enabled]) => Boolean(enabled) && capabilityLabels[capability as keyof typeof capabilityLabels])
                      .map(([capability]) => (
                        <Badge key={capability} variant="outline" className="text-xs">
                          {capabilityLabels[capability as keyof typeof capabilityLabels] ?? capability}
                        </Badge>
                      ))}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {model.capabilities?.image_gen ? (
                    <Badge variant={imageGenBadge.variant} className="text-xs">{`出图：${imageGenBadge.text}`}</Badge>
                  ) : null}
                  {model.capabilities?.image_edit ? (
                    <Badge variant={imageEditBadge.variant} className="text-xs">{`编辑：${imageEditBadge.text}`}</Badge>
                  ) : null}
                  {model.capabilities?.image_gen && model.capabilities?.real_image_gen === false ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      不建议真实出图
                    </Badge>
                  ) : null}
                  {model.capabilities?.image_gen && model.capabilities?.real_image_gen !== false ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      可真实出图
                    </Badge>
                  ) : null}
                </div>

                {model.endpointSupport?.note ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-4 text-muted-foreground">
                    {model.endpointSupport.note}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ProviderSettings({ initialProviders, adminSecret }: ProviderSettingsProps) {
  const [providers, setProviders] = useState(initialProviders);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>文本模型服务</CardTitle>
          <CardDescription>负责商品分析、文案规划等文本生成任务。推荐：Kimi、DeepSeek、GPT-4o。</CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderConfigPanel
            purpose="text"
            purposeLabel="文本模型"
            purposeDescription="负责商品分析、文案规划等文本生成任务"
            allProviders={providers}
            onProvidersChange={setProviders}
            adminSecret={adminSecret}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>图片模型服务</CardTitle>
          <CardDescription>负责头图、详情图生成与编辑。推荐：OpenAI DALL-E、硅基流动、Gemini Imagen。</CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderConfigPanel
            purpose="image"
            purposeLabel="图片模型"
            purposeDescription="负责头图、详情图生成与编辑"
            adminSecret={adminSecret}
            allProviders={providers}
            onProvidersChange={setProviders}
          />
        </CardContent>
      </Card>
    </div>
  );
}
