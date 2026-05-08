"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fileToBase64Payload } from "@/lib/utils/base64-upload";
import { assetTypeLabels, platformLabels, platformOptions, styleLabels, styleOptions } from "@/types/domain";
import { projectCreateSchema } from "@/lib/validations/project";

type ProjectCreateValues = z.input<typeof projectCreateSchema>;
type UploadBucketKey = "MAIN" | "ANGLE" | "DETAIL" | "REFERENCE" | "PACKAGING" | "NUTRITION" | "INGREDIENT";
type UploadBuckets = Record<UploadBucketKey, File[]>;

function PreviewGrid(props: {
  type: UploadBucketKey;
  files: File[];
  onRemove: (index: number) => void;
}) {
  if (props.files.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/70 p-4 text-xs text-muted-foreground">
        暂未选择文件
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {props.files.map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        return (
          <div key={`${file.name}-${index}`} className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="aspect-square bg-slate-100">
              <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-xs text-muted-foreground">{file.name}</p>
              <button
                type="button"
                onClick={() => props.onRemove(index)}
                className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-rose-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.98]"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                删除
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectCreator() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploads, setUploads] = useState<UploadBuckets>({
    MAIN: [],
    ANGLE: [],
    DETAIL: [],
    REFERENCE: [],
    PACKAGING: [],
    NUTRITION: [],
    INGREDIENT: [],
  });

  const form = useForm<ProjectCreateValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: "",
      platform: "general_ecommerce",
      style: "generic_clean",
      description: "",
      productInfo: "",
      category: "",
      sellingPoints: "",
      targetAudience: "",
    },
  });

  const assetGroups = useMemo(
    () =>
      [
        {
          type: "MAIN" as const,
          label: assetTypeLabels.MAIN,
          hint: "选填。上传图片可提升 AI 分析准确度；不上传时 AI 将基于文字信息分析。",
          multiple: false,
          required: false,
        },
        {
          type: "ANGLE" as const,
          label: assetTypeLabels.ANGLE,
          hint: "选填。未上传时，后续可由 AI 自动补充角度表现。",
          multiple: true,
          required: false,
        },
        {
          type: "DETAIL" as const,
          label: assetTypeLabels.DETAIL,
          hint: "选填。未上传时，后续可由 AI 自动补充细节表现。",
          multiple: true,
          required: false,
        },
        {
          type: "REFERENCE" as const,
          label: assetTypeLabels.REFERENCE,
          hint: "选填。用于约束风格或构图，不会自动替代主商品信息。",
          multiple: true,
          required: false,
        },
        {
          type: "PACKAGING" as const,
          label: assetTypeLabels.PACKAGING,
          hint: "选填。产品包装外观图，帮助 AI 了解品牌视觉和包装风格。",
          multiple: true,
          required: false,
        },
        {
          type: "NUTRITION" as const,
          label: assetTypeLabels.NUTRITION,
          hint: "选填。营养成分表，用于 specs/详情 section 的准确数据展示。",
          multiple: false,
          required: false,
        },
        {
          type: "INGREDIENT" as const,
          label: assetTypeLabels.INGREDIENT,
          hint: "选填。配料表，帮助 AI 准确描述产品成分。",
          multiple: false,
          required: false,
        },
      ],
    [],
  );

  const updateBucket = (type: UploadBucketKey, files: File[]) => {
    setUploads((current) => ({
      ...current,
      [type]: files,
    }));
  };

  const handleFileChange = (type: UploadBucketKey, fileList: FileList | null, multiple: boolean) => {
    const files = fileList ? Array.from(fileList) : [];
    updateBucket(type, multiple ? files : files.slice(0, 1));
  };

  const removeQueuedFile = (type: UploadBucketKey, index: number) => {
    updateBucket(
      type,
      uploads[type].filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const accessKey = typeof window !== "undefined" ? localStorage.getItem("bm_access_key") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessKey) headers["x-access-key"] = accessKey;

      const createResponse = await fetch("/api/projects", {
        method: "POST",
        headers,
        body: JSON.stringify(values),
      });
      const createdPayload = await createResponse.json();
      if (!createdPayload.success) throw new Error(createdPayload.error?.message ?? "创建项目失败");

      const projectId = createdPayload.data.id as string;

      for (const [type, files] of Object.entries(uploads) as Array<[UploadBucketKey, File[]]>) {
        for (const file of files) {
          const base64Payload = await fileToBase64Payload(file);
          const uploadResponse = await fetch(`/api/projects/${projectId}/assets/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              ...base64Payload,
            }),
          });
          const uploadPayload = await uploadResponse.json();
          if (!uploadPayload.success) {
            throw new Error(uploadPayload.error?.message ?? `${file.name} 上传失败`);
          }
        }
      }

      toast.success("项目已创建");
      router.push(`/projects/${projectId}/analysis`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建项目失败");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>新建商品项目</CardTitle>
        <CardDescription>创建项目后会自动跳转到分析页，继续完成 AI 结构化解析与 section 规划。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>项目名称</Label>
            <Input {...form.register("name")} placeholder="例如：蕉感绒毛毯 2026 春季主推款" />
          </div>
          <div className="space-y-2">
            <Label>平台</Label>
            <select className="flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm" {...form.register("platform")}>
              {platformOptions.map((option) => (
                <option key={option} value={option}>
                  {platformLabels[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>风格</Label>
            <select className="flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm" {...form.register("style")}>
              {styleOptions.map((option) => (
                <option key={option} value={option}>
                  {styleLabels[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>备注</Label>
            <Textarea {...form.register("description")} placeholder="补充平台策略、目标客群、投放目标等信息" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>产品信息（供 AI 分析）</Label>
            <Textarea {...form.register("productInfo")} placeholder="例如：全麦山药茯苓馒头，低GI认证，药食同源，适合控糖人群..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>品类</Label>
            <Input {...form.register("category")} placeholder="例如：食品 / 3C数码 / 服装" />
          </div>
          <div className="space-y-2">
            <Label>目标人群</Label>
            <Input {...form.register("targetAudience")} placeholder="例如：上班族、减脂人群" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>核心卖点</Label>
            <Textarea {...form.register("sellingPoints")} placeholder="例如：1.低GI认证 2.三重高纤 3.乳酸菌发酵..." rows={3} />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border p-4">
          <p className="text-sm font-medium mb-2">📤 上传产品图片（选填）</p>
          <p className="text-xs text-muted-foreground mb-4">如果不传图片，AI 将基于上方文字信息进行分析。上传图片可获得更准确的视觉效果。</p>
          <div className="grid gap-4 md:grid-cols-2">
          {assetGroups.map((group) => (
            <div key={group.type} className="space-y-3 rounded-3xl border border-dashed border-border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label>{group.label}</Label>
                  <span className={`text-xs ${group.required ? "text-rose-500" : "text-muted-foreground"}`}>
                    {group.required ? "必填" : "选填"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{group.hint}</p>
              </div>

              <Input
                type="file"
                multiple={group.multiple}
                accept="image/*"
                onChange={(event) => handleFileChange(group.type, event.target.files, group.multiple)}
              />

              <PreviewGrid
                type={group.type}
                files={uploads[group.type]}
                onRemove={(index) => removeQueuedFile(group.type, index)}
              />
            </div>
          ))}
        </div>
        </div>

        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          创建项目并上传素材
        </Button>
      </CardContent>
    </Card>
  );
}
