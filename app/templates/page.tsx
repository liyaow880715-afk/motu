"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Wand2,
  Save,
  Trash2,
  ArrowRight,
  ImageIcon,
  Layers,
  Palette,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TemplateRecord, TemplateModule } from "@/types/template";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [structure, setStructure] = useState<{
    overallStyle: string;
    colorPalette: string[];
    typography: Record<string, string>;
    modules: TemplateModule[];
  } | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [applyTarget, setApplyTarget] = useState<TemplateRecord | null>(null);
  const [applyProductName, setApplyProductName] = useState("");
  const [applyPlatform, setApplyPlatform] = useState("淘宝");
  const [applying, setApplying] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data.templates);
      }
    } catch {
      toast.error("加载模板列表失败");
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newFiles);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    if (!description.trim() && uploadedFiles.length === 0) {
      toast.error("请上传参考图或输入描述");
      return;
    }
    setAnalyzing(true);
    try {
      let res: Response;

      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        formData.append("description", description);
        uploadedFiles.forEach((file) => formData.append("images", file));
        res = await fetch("/api/templates/analyze", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/templates/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
      }

      const data = await res.json();
      if (data.success) {
        setStructure(data.data.structure);
        setStep(2);
        toast.success("AI 分析完成");
      } else {
        throw new Error(data.error?.message ?? "分析失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分析失败");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("请输入模板名称");
      return;
    }
    if (!structure) {
      toast.error("请先完成分析");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          referenceImageUrl: referenceImageUrl || "/window.svg",
          structureJson: structure,
          styleProfile: {
            overallStyle: structure.overallStyle,
            colorPalette: structure.colorPalette,
            typography: structure.typography,
          },
          description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("模板保存成功");
        setShowCreate(false);
        resetForm();
        fetchTemplates();
      } else {
        throw new Error(data.error?.message ?? "保存失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${pendingDeleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("已删除");
        fetchTemplates();
      } else {
        throw new Error(data.error?.message ?? "删除失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  }

  async function handleApply(template: TemplateRecord) {
    setApplyTarget(template);
    setApplyProductName("");
    setApplyPlatform("淘宝");
  }

  async function confirmApply() {
    if (!applyTarget || !applyProductName.trim()) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/templates/${applyTarget.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${applyProductName.trim()} 详情页`,
          platform: applyPlatform,
          style: "套版生成",
          productName: applyProductName.trim(),
          productCategory: "通用",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("模板应用成功，正在跳转编辑器...");
        router.push(`/projects/${data.data.projectId}/editor`);
      } else {
        throw new Error(data.error?.message ?? "应用失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "应用失败");
    } finally {
      setApplying(false);
      setApplyTarget(null);
    }
  }

  function resetForm() {
    setStep(1);
    setName("");
    setDescription("");
    setReferenceImageUrl("");
    setUploadedFiles([]);
    setPreviewUrls([]);
    setStructure(null);
    setExpandedModules(new Set());
  }

  function toggleModule(index: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function updateModule(index: number, field: keyof TemplateModule, value: string) {
    if (!structure) return;
    const next = { ...structure };
    next.modules = next.modules.map((m, i) =>
      i === index ? { ...m, [field]: value } : m,
    );
    setStructure(next);
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" />
            套版中心
          </h1>
          <p className="text-muted-foreground mt-1">
            分析参考详情页结构，保存为模板，套用在自己的商品上
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          新建模板
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-8 overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h3 className="font-medium">新建模板</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardContent className="p-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>模板名称</Label>
                  <Input
                    placeholder="如：POLOWALK 夹克详情页模板"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>上传参考页长图（支持 vision 模型直接看图分析）</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="template-image-upload"
                    />
                    <label htmlFor="template-image-upload" className="cursor-pointer">
                      <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        点击上传或拖拽图片到此处
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 JPG、PNG，建议上传完整详情页长图
                      </p>
                    </label>
                  </div>

                  {/* Preview */}
                  {previewUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {previewUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                          <img src={url} alt="预览" className="h-full w-full object-cover" />
                          <button
                            onClick={() => removeFile(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>参考页描述（可选，辅助 AI 理解）</Label>
                  <Textarea
                    placeholder="请详细描述参考详情页的结构和风格，例如：
品牌头图是多人群像街拍，白底黑字简约风；
接下来是门店形象展示，然后是购买理由三个标签卡片；
有尺码表、真人模特试穿、多角度展示、面料卖点、平铺展示、细节特写等模块..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {uploadedFiles.length > 0
                      ? "已上传图片，AI 将优先看图分析。补充描述可提升准确度。"
                      : "未上传图片时，AI 将仅基于文字描述进行分析。"}
                  </p>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || (!description.trim() && uploadedFiles.length === 0)}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI 分析中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      {uploadedFiles.length > 0 ? "开始 AI 看图拆版" : "开始 AI 分析"}
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 2 && structure && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">整体风格</span>
                  </div>
                  <p className="mt-1 text-sm">{structure.overallStyle}</p>
                  <div className="mt-2 flex gap-1">
                    {structure.colorPalette.map((c, i) => (
                      <div
                        key={i}
                        className="h-6 w-6 rounded border"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      模块结构（{structure.modules.length} 个）
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {structure.modules.map((mod, i) => (
                      <div key={i} className="rounded-lg border bg-card overflow-hidden">
                        <button
                          className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
                          onClick={() => toggleModule(i)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                              {mod.order}
                            </span>
                            <span className="text-sm font-medium">{mod.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {mod.type}
                            </Badge>
                          </div>
                          {expandedModules.has(i) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {expandedModules.has(i) && (
                          <div className="border-t px-3 py-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">模块名称</Label>
                                <Input
                                  value={mod.name}
                                  onChange={(e) => updateModule(i, "name", e.target.value)}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">宽高比</Label>
                                <Input
                                  value={mod.aspectRatio}
                                  onChange={(e) => updateModule(i, "aspectRatio", e.target.value)}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">风格描述</Label>
                              <Textarea
                                value={mod.styleNotes}
                                onChange={(e) => updateModule(i, "styleNotes", e.target.value)}
                                className="mt-1 text-sm"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">文案排版</Label>
                              <Input
                                value={mod.textLayout}
                                onChange={(e) => updateModule(i, "textLayout", e.target.value)}
                                className="mt-1 h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    返回修改
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1">
                    确认保存
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <LayoutTemplate className="mx-auto h-10 w-10 text-primary" />
                  <h4 className="mt-2 font-medium">确认保存模板</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    模板名称：{name}
                    <br />
                    包含 {structure?.modules.length ?? 0} 个模块
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    返回编辑
                  </Button>
                  <Button onClick={handleSave} disabled={loading} className="flex-1">
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    保存模板
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <LayoutTemplate className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">暂无模板</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            点击右上角"新建模板"，分析参考详情页并保存为可复用的模板
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {template.referenceImageUrl ? (
                  <img
                    src={template.referenceImageUrl}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button variant="secondary" onClick={() => handleApply(template)}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    套用此模板
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {template.moduleCount} 个模块 · {template.category}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {template.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {(template.structureJson as any)?.modules?.slice(0, 4).map((m: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="删除模板"
        description="确定要删除这个模板吗？此操作不可恢复。"
        confirmText="确认删除"
        cancelText="取消"
        destructive
        loading={deleting}
        icon={<Trash2 className="h-5 w-5" />}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />

      {applyTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setApplyTarget(null)}
          />
          <div className="relative z-[121] w-full max-w-md rounded-[28px] border border-border bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#111214]">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">套用模板</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              将「{applyTarget.name}」应用到新商品
            </p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">商品名称</Label>
                <Input
                  value={applyProductName}
                  onChange={(e) => setApplyProductName(e.target.value)}
                  placeholder="例如：全麦山药茯苓馒头"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">电商平台</Label>
                <select
                  value={applyPlatform}
                  onChange={(e) => setApplyPlatform(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm dark:bg-black/30 dark:text-slate-100"
                >
                  <option>淘宝</option>
                  <option>京东</option>
                  <option>拼多多</option>
                  <option>抖音</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setApplyTarget(null)} disabled={applying} className="rounded-xl">
                取消
              </Button>
              <Button onClick={confirmApply} disabled={applying || !applyProductName.trim()} className="rounded-xl">
                {applying ? "应用中..." : "确认套用"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
