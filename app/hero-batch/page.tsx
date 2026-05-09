"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  Sparkles,
  Upload,
  Download,
  ImageIcon,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PRESET_STYLES = [
  "白底简约，产品居中，柔和影棚光，干净背景",
  "生活场景，产品摆放在木质桌面，自然窗光，温暖氛围",
  "户外街拍，模特手持产品，城市背景虚化，时尚杂志感",
  "极简艺术，纯色渐变背景，产品悬浮，柔和阴影",
  "礼盒开箱，产品放置在精美包装中，丝带装饰",
  "俯拍平铺，产品与配件整齐排列，浅色布面，ins 风",
  "暗黑高级，黑色背景，聚光灯打在产品上，金属光泽",
  "温馨居家，产品放在沙发/床头，暖黄灯光，生活气息",
  "科技感，蓝色冷光背景，电路纹理，未来感",
  "自然清新，绿色植物背景，阳光穿透，环保感",
  "节日氛围，红色金色装饰，灯笼/圣诞树，喜庆感",
  "运动活力，健身房/跑道背景，动感光线，年轻感",
];

const ASPECT_RATIOS = [
  { label: "1:1 正方形", value: "1:1" },
  { label: "3:4 竖图", value: "3:4" },
  { label: "4:3 横图", value: "4:3" },
  { label: "16:9 宽屏", value: "16:9" },
];

export default function HeroBatchPage() {
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [count, setCount] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedStyles, setSelectedStyles] = useState<string[]>(PRESET_STYLES.slice(0, 4));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<Array<{ index: number; style: string; imageUrl: string; loading: boolean; error?: string }>>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleAnalyzeImage = useCallback(async () => {
    if (productImages.length === 0) {
      toast.error("请先上传商品图片");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/hero-batch/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productImage: productImages[0] }),
      });
      const data = await res.json();
      if (data.success) {
        const info = data.data;
        setProductName(info.productName ?? "");
        const descParts = [
          info.category ? `品类：${info.category}` : "",
          info.material ? `材质：${info.material}` : "",
          info.color ? `颜色：${info.color}` : "",
          info.targetAudience ? `目标人群：${info.targetAudience}` : "",
          Array.isArray(info.sellingPoints) && info.sellingPoints.length ? `卖点：${info.sellingPoints.join("、")}` : "",
          info.description ?? "",
          Array.isArray(info.usageScenarios) && info.usageScenarios.length ? `适用场景：${info.usageScenarios.join("、")}` : "",
        ].filter(Boolean);
        setProductDesc(descParts.join("\n"));
        toast.success("AI 分析完成，已自动填充商品信息");
      } else {
        throw new Error(data.error?.message ?? "分析失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分析失败");
    } finally {
      setAnalyzing(false);
    }
  }, [productImages]);

  const readFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImages: string[] = [];
    let loaded = 0;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        loaded++;
        if (loaded === files.length) {
          setProductImages((prev) => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    readFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    readFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(style)) return prev.filter((s) => s !== style);
      if (prev.length >= 12) return prev;
      return [...prev, style];
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!productName.trim()) {
      toast.error("请输入商品名称");
      return;
    }
    if (selectedStyles.length === 0) {
      toast.error("请至少选择一种风格");
      return;
    }

    // Cycle styles if count > selected styles
    const stylesToUse: string[] = [];
    for (let i = 0; i < count; i++) {
      stylesToUse.push(selectedStyles[i % selectedStyles.length]);
    }

    setRunning(true);
    setProgress(0);
    setResults(stylesToUse.map((style, i) => ({ index: i, style, imageUrl: "", loading: true })));

    for (let i = 0; i < stylesToUse.length; i++) {
      setProgress(i + 1);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000); // 3分钟超时
      try {
        const res = await fetch("/api/hero-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            productName,
            productDescription: productDesc,
            productImages: productImages.length > 0 ? productImages : undefined,
            style: stylesToUse[i],
            aspectRatio,
          }),
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (data.success) {
          setResults((prev) =>
            prev.map((r) => (r.index === i ? { ...r, imageUrl: data.data.imageUrl, loading: false } : r)),
          );
        } else {
          throw new Error(data.error?.message ?? "生成失败");
        }
      } catch (error) {
        clearTimeout(timeout);
        const msg = error instanceof Error ? error.message : "失败";
        // 区分用户主动取消和超时
        const displayError = msg.includes("aborted") || msg.includes("AbortError") ? "请求超时或已取消" : msg;
        setResults((prev) =>
          prev.map((r) => (r.index === i ? { ...r, error: displayError, loading: false } : r)),
        );
      }
      if (i < stylesToUse.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setRunning(false);
    toast.success("批量生成完成！");
  }, [productName, productDesc, productImages, count, aspectRatio, selectedStyles]);

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `主图-${productName || "商品"}-${index + 1}.png`;
      a.click();
    } catch {
      toast.error("下载失败");
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          批量主图生成器
        </h1>
        <p className="text-muted-foreground mt-1">
          上传商品图，选择风格，一次生成 10-20 张电商主图
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Panel - Settings */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Upload */}
              <div className="space-y-2">
                <Label>商品图片（支持多张）</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" id="product-upload" />
                  <label htmlFor="product-upload" className="cursor-pointer">
                    {productImages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {productImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img} alt={`商品图 ${idx + 1}`} className="h-20 w-full rounded-lg object-cover" />
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); removeImage(idx); }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-muted-foreground/30">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">点击或拖拽上传商品图（支持多张）</p>
                      </>
                    )}
                  </label>
                </div>
                {productImages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAnalyzeImage}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        AI 分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI 分析图片文案
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>商品名称</Label>
                <Input placeholder="如：红色保温杯" value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>商品卖点/描述（可选）</Label>
                <Textarea placeholder="如：304不锈钢、24小时保温、500ml大容量..." value={productDesc} onChange={(e) => setProductDesc(e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <Label>生成数量：{count} 张</Label>
                <input
                  type="range"
                  min={5}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5</span>
                  <span>20</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>图片比例</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setAspectRatio(r.value)}
                      className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                        aspectRatio === r.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>选择风格（{selectedStyles.length} 种）</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_STYLES.map((style) => {
                    const selected = selectedStyles.includes(style);
                    return (
                      <button
                        key={style}
                        onClick={() => toggleStyle(style)}
                        disabled={running}
                        className={`rounded-full px-2.5 py-1 text-[10px] border transition-colors ${
                          selected ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {style.split("，")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={running} className="w-full">
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中 {progress}/{count}
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    生成 {count} 张主图
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Results */}
        <div>
          {results.length === 0 ? (
            <Card className="h-full flex items-center justify-center p-12">
              <div className="text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">左侧设置参数后点击生成</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.map((r) => (
                <Card key={r.index} className="overflow-hidden group">
                  <div className={`bg-muted relative ${
                    aspectRatio === "1:1" ? "aspect-square" :
                    aspectRatio === "3:4" ? "aspect-[3/4]" :
                    aspectRatio === "4:3" ? "aspect-[4/3]" :
                    aspectRatio === "16:9" ? "aspect-video" : "aspect-square"
                  }`}>
                    {r.loading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : r.error ? (
                      <div className="flex h-full items-center justify-center text-xs text-red-500 p-2 text-center">
                        {r.error}
                      </div>
                    ) : (
                      <>
                        <img src={r.imageUrl} alt={`主图 ${r.index + 1}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleDownload(r.imageUrl, r.index)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-2">
                    <Badge variant="outline" className="text-[10px]">主图 {r.index + 1}</Badge>
                    <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{r.style}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
