"use client";

import { useState } from "react";
import { Loader2, UploadCloud, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fileToBase64Payload } from "@/lib/utils/base64-upload";
import { useAuthStore } from "@/hooks/use-auth-store";

function buildDraftProjectName() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ];
  return `未命名商品项目-${parts.join("")}`;
}

export function QuickStartWorkspace() {
  const router = useRouter();
  const { keyInfo } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [productInfo, setProductInfo] = useState("");
  const [category, setCategory] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const isPerUseExhausted = keyInfo?.type === "PER_USE" && (keyInfo.usedCount ?? 0) >= 1;

  const handleStart = async () => {
    if (!productInfo.trim() && !file) {
      toast.error("请至少填写产品信息或上传一张图片");
      return;
    }

    // Consume PER_USE key before creating project
    if (keyInfo?.type === "PER_USE") {
      const machineId = typeof window !== "undefined" ? localStorage.getItem("bm_machine_id") : null;
      const consumeRes = await fetch("/api/auth/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInfo.key, machineId }),
      });
      const consumeData = await consumeRes.json();
      if (!consumeData.success) {
        toast.error(consumeData.error?.message ?? "次卡已用完");
        return;
      }
    }

    setSubmitting(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (keyInfo?.key) {
        headers["x-access-key"] = keyInfo.key;
      }

      const createResponse = await fetch("/api/projects", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: buildDraftProjectName(),
          platform: "general_ecommerce",
          style: "generic_clean",
          description: productInfo,
          productInfo,
          category,
          sellingPoints,
          targetAudience,
        }),
      });
      const createdPayload = await createResponse.json();
      if (!createdPayload.success) {
        throw new Error(createdPayload.error?.message ?? "创建项目失败");
      }

      const projectId = createdPayload.data.id as string;

      if (file) {
        const base64Payload = await fileToBase64Payload(file);
        const uploadResponse = await fetch(`/api/projects/${projectId}/assets/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "MAIN",
            ...base64Payload,
          }),
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadPayload.success) {
          throw new Error(uploadPayload.error?.message ?? "主商品图上传失败");
        }
      }

      const analyzeResponse = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const analyzePayload = await analyzeResponse.json();

      if (!analyzePayload.success) {
        const rawErrorCode = String(analyzePayload.error?.code ?? "");
        const shouldAutoRetry = rawErrorCode === "PROVIDER_TIMEOUT";
        const errorCode = encodeURIComponent(rawErrorCode);
        const errorMessage = encodeURIComponent(
          String(analyzePayload.error?.message ?? "自动分析未完成。"),
        );

        toast.warning(
          shouldAutoRetry
            ? "正在为你跳转到分析页继续自动重试。"
            : "已为你跳转到分析页继续处理。",
        );

        router.push(
          `/projects/${projectId}/analysis?source=quick-start${shouldAutoRetry ? "&autoRun=1" : ""}&analysisErrorCode=${errorCode}&analysisErrorMessage=${errorMessage}`,
        );
        return;
      }

      toast.success("AI 已自动完成首轮分析。");
      router.push(`/projects/${projectId}/analysis`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "快速开始失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 dark:text-white md:text-5xl">
          创建商品详情页
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-500 dark:text-slate-400">
          填写产品信息，AI 自动生成完整的详情页方案
        </p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white/84 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/6 md:p-10">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>产品信息 <span className="text-rose-500">*</span></Label>
            <Textarea
              value={productInfo}
              onChange={(e) => setProductInfo(e.target.value)}
              placeholder="例如：全麦山药茯苓馒头，低GI认证，药食同源，适合控糖人群..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>品类</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例如：食品 / 3C数码 / 服装"
            />
          </div>
          <div className="space-y-2">
            <Label>目标人群</Label>
            <Input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="例如：上班族、减脂人群"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>核心卖点</Label>
            <Textarea
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
              placeholder="例如：1.低GI认证 2.三重高纤 3.乳酸菌发酵..."
              rows={2}
            />
          </div>
        </div>

        <div
          className={`mt-6 rounded-[1.75rem] border border-dashed p-6 transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-slate-300 bg-white/50 dark:border-white/10 dark:bg-white/[0.03]"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files?.[0] ?? null;
            if (dropped && dropped.type.startsWith("image/")) {
              setFile(dropped);
            } else if (dropped) {
              toast.error("请上传图片文件");
            }
          }}
        >
          <p className="text-sm font-medium mb-3">📤 上传产品图片（选填）</p>
          <Input
            id="quick-start-file"
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mb-2"
          />
          {file ? (
            <p className="text-xs text-slate-500">已选择：{file.name}</p>
          ) : (
            <p className="text-xs text-slate-500">点击选择或拖拽图片到此处</p>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleStart}
            disabled={submitting || (!productInfo.trim() && !file) || isPerUseExhausted}
            className="min-w-[220px] rounded-full px-8"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {submitting ? "正在分析产品…" : isPerUseExhausted ? "次卡已用完" : "开始生成详情页方案"}
          </Button>
        </div>
      </div>
    </section>
  );
}
