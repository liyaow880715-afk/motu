"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Clapperboard,
  Copy,
  Film,
  ImagePlus,
  Loader2,
  Play,
  Sparkles,
  Upload,
  Video,
  Wand2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { VideoCanvas } from "@/components/video/video-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type VideoMode = "pipeline" | "clone";

type StoryboardData = {
  title: string;
  hook: SceneData;
  scenes: SceneData[];
  cta: SceneData;
  total_duration: number;
  bgm_mood?: string | null;
  style_notes?: string | null;
  video_aspect?: string | null;
};

type SceneData = {
  index: number;
  type: string;
  duration: number;
  visual_desc: string;
  copy: string;
  camera: string;
  product_image_index?: number | null;
  material_search_terms?: string[] | null;
};

type AnalysisResult = {
  analysis?: {
    original_duration: number;
    original_script: string;
    storyboard: StoryboardData;
    hook_type?: string;
    pacing?: string;
    bgm_description?: string;
    color_grade?: string;
  } | null;
  error?: string;
};

const DURATIONS = [10, 15, 30, 60];
const STYLES = [
  { value: "auto", label: "自动" },
  { value: "痛点营销", label: "痛点营销" },
  { value: "种草测评", label: "种草测评" },
  { value: "剧情反转", label: "剧情反转" },
  { value: "硬核参数", label: "硬核参数" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SceneCard({ scene, index }: { scene: SceneData; index: number }) {
  const typeColors: Record<string, string> = {
    text_hook: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    product_showcase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    atmosphere: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    cta: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    transition: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300",
  };

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {index}
        </div>
        {index >= 0 && <div className="mt-1 h-full w-px bg-border" />}
      </div>
      <div className="flex-1 pb-6">
        <div className="rounded-2xl border border-border bg-background p-4 dark:bg-black/20">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={typeColors[scene.type] || typeColors.transition}>
              {scene.type}
            </Badge>
            <span className="text-xs text-muted-foreground">{scene.duration.toFixed(1)}s</span>
            <Badge variant="outline" className="text-xs">
              {scene.camera}
            </Badge>
            {scene.product_image_index !== null && scene.product_image_index !== undefined && (
              <Badge variant="outline" className="text-xs">
                图 #{scene.product_image_index}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm font-medium">{scene.copy}</p>
          <p className="mt-1 text-xs text-muted-foreground">{scene.visual_desc}</p>
          {scene.material_search_terms && scene.material_search_terms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {scene.material_search_terms.map((term) => (
                <span key={term} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoryboardPreview({ storyboard }: { storyboard: StoryboardData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{storyboard.title || "未命名分镜"}</CardTitle>
          <Badge variant="outline">{storyboard.total_duration.toFixed(1)}s</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {storyboard.bgm_mood && <Badge variant="outline">BGM: {storyboard.bgm_mood}</Badge>}
          {storyboard.style_notes && (
            <span className="text-xs text-muted-foreground">{storyboard.style_notes}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <SceneCard scene={storyboard.hook} index={0} />
          {storyboard.scenes.map((scene, i) => (
            <SceneCard key={scene.index} scene={scene} index={i + 1} />
          ))}
          <SceneCard scene={storyboard.cta} index={storyboard.scenes.length + 1} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function VideoPage() {
  const [mode, setMode] = useState<VideoMode>("pipeline");

  // Pipeline state
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productImagesLoading, setProductImagesLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [targetDuration, setTargetDuration] = useState(15);
  const [style, setStyle] = useState("auto");
  const [videoCount, setVideoCount] = useState(1);

  // Clone state
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [cloneProductImages, setCloneProductImages] = useState<string[]>([]);
  const [clonePrompt, setClonePrompt] = useState("");

  // Result state
  const [storyboards, setStoryboards] = useState<StoryboardData[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [canvasMode, setCanvasMode] = useState(false);
  const [activeStoryboard, setActiveStoryboard] = useState<StoryboardData | null>(null);

  const handleProductImagesUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      setProductImagesLoading(true);
      try {
        const base64s = await Promise.all(Array.from(files).map(fileToBase64));
        setProductImages((prev) => [...prev, ...base64s]);
      } catch {
        toast.error("图片读取失败");
      } finally {
        setProductImagesLoading(false);
      }
    },
    []
  );

  const handleCloneImagesUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      try {
        const base64s = await Promise.all(Array.from(files).map(fileToBase64));
        setCloneProductImages((prev) => [...prev, ...base64s]);
      } catch {
        toast.error("图片读取失败");
      }
    },
    []
  );

  async function handleGenerateStoryboard() {
    if (productImages.length === 0) {
      toast.error("请至少上传一张产品图片");
      return;
    }
    if (!prompt.trim()) {
      toast.error("请输入产品卖点描述");
      return;
    }

    setLoading(true);
    setLoadingText("正在生成分镜脚本...");
    setStoryboards([]);

    try {
      const response = await fetch("/api/video/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productImages,
          prompt,
          targetDuration,
          style,
          videoCount,
        }),
      });

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message || "生成失败");
      }

      const boards: StoryboardData[] = payload.data?.storyboards || [];
      setStoryboards(boards);
      if (boards.length > 0) {
        setActiveStoryboard(boards[0]);
      }
      toast.success(`成功生成 ${boards.length} 个分镜脚本`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeVideo() {
    if (!referenceVideo) {
      toast.error("请上传参考视频");
      return;
    }

    setLoading(true);
    setLoadingText("正在分析视频结构...");
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append("file", referenceVideo);

      const response = await fetch("/api/video/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message || "分析失败");
      }

      setAnalysisResult(payload.data);
      if (payload.data?.analysis) {
        toast.success("视频分析完成");
      } else {
        toast.error(payload.data?.error || "分析失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {canvasMode && activeStoryboard ? (
        <VideoCanvas
          storyboard={activeStoryboard}
          productImages={productImages}
          onExit={() => setCanvasMode(false)}
        />
      ) : (
        <>
          <PageHeader
            eyebrow="AI 视频生成"
            title="短视频创意工作台"
            description="基于 MoneyPrinterTurbo 引擎，从产品图直接生成 TikTok 风格分镜脚本，或拆解爆款视频结构进行复刻。"
          />

          {/* Mode switcher */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setMode("pipeline")}
          className={`flex items-center gap-4 rounded-3xl border p-5 text-left transition-all ${
            mode === "pipeline"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-muted/40 hover:bg-muted/60"
          }`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              mode === "pipeline" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">产品流水线</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              上传产品图 + 卖点描述 → AI 生成分镜脚本
            </p>
          </div>
        </button>

        <button
          onClick={() => setMode("clone")}
          className={`flex items-center gap-4 rounded-3xl border p-5 text-left transition-all ${
            mode === "clone"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border bg-muted/40 hover:bg-muted/60"
          }`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              mode === "clone" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            }`}
          >
            <Film className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">爆款复刻</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              上传参考视频 → AI 拆解结构 → 替换产品复刻
            </p>
          </div>
        </button>
      </div>

      {/* Pipeline form */}
      {mode === "pipeline" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                产品素材
              </CardTitle>
              <CardDescription>上传 1-5 张产品图片，AI 会分析视觉特征并分配到不同镜头</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {productImages.map((img, i) => (
                  <div key={i} className="relative h-24 w-24 rounded-2xl border border-border overflow-hidden">
                    <img
                      src={`data:image/jpeg;base64,${img}`}
                      alt={`product-${i}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => setProductImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 transition-colors hover:bg-muted/60">
                  {productImagesLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="mt-1 text-[10px] text-muted-foreground">添加图片</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleProductImagesUpload}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <Label>产品卖点描述</Label>
                <Textarea
                  placeholder="例如：这款无线降噪耳机，42dB深度降噪，40小时续航，佩戴舒适不压耳..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                生成参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>目标时长</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setTargetDuration(d)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        targetDuration === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {d} 秒
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>风格偏好</Label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        style === s.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>生成数量（1-10）</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={videoCount}
                  onChange={(e) => setVideoCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-32"
                />
              </div>

              <Button
                onClick={handleGenerateStoryboard}
                disabled={loading || productImages.length === 0 || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成分镜脚本
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {storyboards.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">生成分镜 ({storyboards.length} 个)</h3>
                <Button size="sm" onClick={() => setCanvasMode(true)}>
                  <Wand2 className="mr-1 h-4 w-4" />
                  进入画布编辑
                </Button>
              </div>
              {storyboards.map((sb, i) => (
                <StoryboardPreview key={i} storyboard={sb} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clone form */}
      {mode === "clone" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4" />
                参考视频
              </CardTitle>
              <CardDescription>上传你想要拆解结构的爆款视频（支持 mp4/mov/avi）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-8 py-6 transition-colors hover:bg-muted/60">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="mt-2 text-sm text-muted-foreground">选择视频文件</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setReferenceVideo(file);
                    }}
                  />
                </label>
                {referenceVideo && (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-sm font-medium">{referenceVideo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(referenceVideo.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleAnalyzeVideo}
                disabled={loading || !referenceVideo}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    拆解视频结构
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Analysis result */}
          {analysisResult?.analysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">视频拆解结果</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (analysisResult.analysis?.storyboard) {
                        setActiveStoryboard(analysisResult.analysis.storyboard);
                        setCanvasMode(true);
                      }
                    }}
                  >
                    <Wand2 className="mr-1 h-4 w-4" />
                    进入画布编辑
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.hook_type && (
                    <Badge variant="outline">Hook: {analysisResult.analysis.hook_type}</Badge>
                  )}
                  {analysisResult.analysis.pacing && (
                    <Badge variant="outline">节奏: {analysisResult.analysis.pacing}</Badge>
                  )}
                  {analysisResult.analysis.bgm_description && (
                    <Badge variant="outline">BGM: {analysisResult.analysis.bgm_description}</Badge>
                  )}
                  {analysisResult.analysis.color_grade && (
                    <Badge variant="outline">色调: {analysisResult.analysis.color_grade}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  原视频时长: {analysisResult.analysis.original_duration}s
                </p>
                {analysisResult.analysis.storyboard && (
                  <StoryboardPreview storyboard={analysisResult.analysis.storyboard} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Replace product section */}
          {analysisResult?.analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  替换产品复刻
                </CardTitle>
                <CardDescription>上传新产品图片和卖点，AI 会保留原视频结构，替换为新产品内容</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {cloneProductImages.map((img, i) => (
                    <div key={i} className="relative h-24 w-24 rounded-2xl border border-border overflow-hidden">
                      <img
                        src={`data:image/jpeg;base64,${img}`}
                        alt={`clone-product-${i}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => setCloneProductImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 transition-colors hover:bg-muted/60">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="mt-1 text-[10px] text-muted-foreground">添加图片</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleCloneImagesUpload}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <Label>新产品卖点</Label>
                  <Textarea
                    placeholder="描述新产品的核心卖点..."
                    value={clonePrompt}
                    onChange={(e) => setClonePrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  disabled={loading || cloneProductImages.length === 0 || !clonePrompt.trim()}
                  className="w-full"
                  size="lg"
                  onClick={async () => {
                    if (!analysisResult?.analysis) {
                      toast.error("请先拆解视频结构");
                      return;
                    }
                    setLoading(true);
                    setLoadingText("正在复刻分镜...");
                    try {
                      const response = await fetch("/api/video/adapt", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          analysis: analysisResult.analysis,
                          productImages: cloneProductImages,
                          replacementPrompt: clonePrompt,
                        }),
                      });
                      const payload = await response.json();
                      if (!payload.success) {
                        throw new Error(payload.error?.message || "复刻失败");
                      }
                      const sb: StoryboardData = payload.data?.storyboard;
                      if (sb) {
                        setActiveStoryboard(sb);
                        setCanvasMode(true);
                        toast.success("分镜复刻完成，已进入画布");
                      }
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "复刻失败");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Clapperboard className="mr-2 h-4 w-4" />
                  )}
                  生成复刻视频
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
