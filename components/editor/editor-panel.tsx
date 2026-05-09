"use client";

import React, { useCallback } from "react";
import { ImagePlus, Loader2, RotateCcw, Save, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/hooks/use-auth-store";
import {
  sectionTypeOptions,
  sectionTypeLabels,
  assetTypeLabels,
  getGenerationLabel,
  getActionText,
} from "./editor-utils";

interface EditorPanelProps {
  project: any;
  selectedSection: any;
  checkedReferences: string[];
  runningAction: string | null;
  onUpdateSection: (key: string, value: unknown) => void;
  onSave: () => void;
  onRunGeneration: (kind: "generate" | "regenerate") => void;
  onRunImageEdit: (mode: "repaint" | "enhance") => void;
  onActivateVersion: (versionId: string) => void;
  onUploadReference: (file: File) => void;
  onRemoveReference: (assetId: string) => void;
  onToggleReference: (assetId: string, checked: boolean) => void;
}

export const EditorPanel = React.memo(function EditorPanel({
  project,
  selectedSection,
  checkedReferences,
  runningAction,
  onUpdateSection,
  onSave,
  onRunGeneration,
  onRunImageEdit,
  onActivateVersion,
  onUploadReference,
  onRemoveReference,
  onToggleReference,
}: EditorPanelProps) {
  const referenceAssets = React.useMemo(
    () => project.assets.filter((asset: any) => ["REFERENCE", "DETAIL", "ANGLE"].includes(asset.type)),
    [project.assets]
  );

  const sectionReferenceAssets = React.useMemo(() => {
    const refIds = (selectedSection?.editableData?.referenceAssetIds as string[] | undefined) ?? [];
    return project.assets.filter((asset: any) => refIds.includes(asset.id));
  }, [selectedSection, project.assets]);

  const hasGeneratedImage = Boolean(selectedSection?.imageUrl);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) onUploadReference(file);
      event.target.value = "";
    },
    [onUploadReference]
  );

  return (
    <Card className="flex min-h-0 min-w-0 flex-col xl:h-[920px]">
      <CardHeader>
        <CardTitle>模块编辑面板</CardTitle>
        <CardDescription>编辑模块内容、发起生成与重绘，并管理版本历史。</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden">
        {!selectedSection ? (
          <div className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            请选择一个模块开始编辑。
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">当前出图结果</span>
                {getGenerationLabel(selectedSection) ? (
                  <Badge variant={getGenerationLabel(selectedSection) === "AI 真图" ? "success" : "outline"}>
                    {getGenerationLabel(selectedSection)}
                  </Badge>
                ) : (
                  <Badge variant="outline">尚未生成</Badge>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                生成完成后会自动保存到项目资源、版本历史以及当前生效版本。
              </p>
            </div>

            <div className="space-y-2">
              <Label>类型</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm"
                value={String(selectedSection.type).toLowerCase()}
                onChange={(event) => onUpdateSection("type", event.target.value.toUpperCase())}
              >
                {sectionTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {sectionTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>标题</Label>
              <Input value={selectedSection.title} onChange={(event) => onUpdateSection("title", event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>模块目标</Label>
              <Input value={selectedSection.goal} onChange={(event) => onUpdateSection("goal", event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>模块文案</Label>
              <Textarea value={selectedSection.copy} onChange={(event) => onUpdateSection("copy", event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>双语视觉 Prompt</Label>
              <Textarea
                value={selectedSection.visualPrompt}
                onChange={(event) => onUpdateSection("visualPrompt", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                系统会要求图像模型把标题、卖点和 CTA 直接生成进图片中，而不是在页面外拼接文字。
              </p>
            </div>

            <div className="space-y-2">
              <Label>模块专属参考图</Label>
              {sectionReferenceAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">未上传专属参考图</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sectionReferenceAssets.map((asset: any) => (
                    <div key={asset.id} className="group relative">
                      <img
                        src={asset.url}
                        alt={asset.fileName}
                        loading="lazy"
                        decoding="async"
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveReference(asset.id)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="section-ref-upload"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => document.getElementById("section-ref-upload")?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  上传参考图
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                这些图将专用于当前模块的 AI 生图，不影响其他模块。系统仍会自动把主商品图作为产品锚点。
              </p>
            </div>

            <div className="space-y-2">
              <Label>全局参考图</Label>
              {referenceAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">当前没有可选参考图</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {referenceAssets.map((asset: any) => (
                    <label
                      key={asset.id}
                      className={`relative cursor-pointer rounded-xl border p-2 transition-colors duration-150 ${
                        checkedReferences.includes(asset.id)
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-muted/30 hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checkedReferences.includes(asset.id)}
                        onChange={(event) => onToggleReference(asset.id, event.target.checked)}
                      />
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                        <img
                          src={asset.url}
                          alt={asset.fileName}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                        {checkedReferences.includes(asset.id) && (
                          <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {assetTypeLabels[asset.type] ?? asset.fileName}
                      </p>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                系统会自动把主商品图作为产品锚点，这里勾选的是额外补充参考图，会一起发送给 AI。
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border p-3">
              <div className="flex flex-wrap gap-3">
                <Button onClick={onSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
                <Button
                  onClick={() => onRunGeneration(hasGeneratedImage ? "regenerate" : "generate")}
                  disabled={Boolean(runningAction)}
                  variant="outline"
                  className="gap-2"
                >
                  {runningAction === "generate" || runningAction === "regenerate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {hasGeneratedImage ? "重新生成当前图" : "生成当前模块图"}
                </Button>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">基于当前图优化</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  已有当前图时，可选择重绘构图，或在保留现有构图基础上做增强。
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    onClick={() => onRunImageEdit("repaint")}
                    disabled={!hasGeneratedImage || Boolean(runningAction)}
                    variant="outline"
                    className="gap-2"
                  >
                    {runningAction === "repaint" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    基于当前图重绘
                  </Button>
                  <Button
                    onClick={() => onRunImageEdit("enhance")}
                    disabled={!hasGeneratedImage || Boolean(runningAction)}
                    variant="outline"
                    className="gap-2"
                  >
                    {runningAction === "enhance" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    基于当前图增强
                  </Button>
                </div>
              </div>
              {runningAction ? <p className="text-xs text-muted-foreground">{getActionText(runningAction)}</p> : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">版本历史</h3>
                <Badge variant="outline">{selectedSection.versions?.length ?? 0} 个版本</Badge>
              </div>
              <div className="space-y-3">
                {(selectedSection.versions ?? []).map((version: any) => (
                  <div key={version.id} className="rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">v{version.versionNumber}</p>
                        <p className="text-xs text-muted-foreground">{version.isActive ? "当前生效版本" : "历史版本"}</p>
                      </div>
                      {!version.isActive ? (
                        <Button size="sm" variant="outline" onClick={() => onActivateVersion(version.id)}>
                          设为当前
                        </Button>
                      ) : (
                        <Badge variant="success">当前</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
