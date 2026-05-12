"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Clock,
  Download,
  Film,
  History,
  ImagePlus,
  Loader2,
  Music,
  Play,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CanvasScene = {
  index: number;
  type: string;
  duration: number;
  copy: string;
  visual_desc: string;
  camera: string;
  imageBase64?: string | null;
  imageStatus?: "empty" | "generating" | "done" | "error";
  product_image_index?: number | null;
  material_search_terms?: string[] | null;
};

export type StoryboardData = {
  title: string;
  hook: CanvasScene;
  scenes: CanvasScene[];
  cta: CanvasScene;
  total_duration: number;
  bgm_mood?: string | null;
  style_notes?: string | null;
  video_aspect?: string | null;
};

type VideoResult = {
  url: string;
  fileName: string;
  size: number;
};

type BgmItem = { name: string; size: number };
type HistoryVideo = { fileName: string; url: string; size: number; createdAt: string };

const VOICES = [
  { value: "zh-CN-XiaoxiaoNeural", label: "晓晓（女声）" },
  { value: "zh-CN-YunxiNeural", label: "云希（男声）" },
  { value: "zh-CN-YunjianNeural", label: "云健（男声·新闻）" },
  { value: "zh-CN-XiaoyiNeural", label: "小艺（女童）" },
  { value: "zh-CN-YunyangNeural", label: "云扬（男声·解说）" },
];

const TRANSITIONS = [
  { value: "", label: "无转场" },
  { value: "fade_in", label: "淡入" },
  { value: "fade_out", label: "淡出" },
  { value: "shuffle", label: "随机" },
];

const TYPE_COLORS: Record<string, string> = {
  text_hook: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  product_showcase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  atmosphere: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  cta: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  transition: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SceneThumbnail({ scene }: { scene: CanvasScene }) {
  if (scene.imageStatus === "generating") {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (scene.imageBase64) {
    return (
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border">
        <img
          src={`data:image/jpeg;base64,${scene.imageBase64}`}
          alt="scene"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
      <ImagePlus className="h-5 w-5 text-muted-foreground" />
      <span className="mt-1 text-[9px] text-muted-foreground">未生成</span>
    </div>
  );
}

interface VideoCanvasProps {
  storyboard: StoryboardData;
  productImages: string[];
  onExit: () => void;
}

export function VideoCanvas({ storyboard, productImages, onExit }: VideoCanvasProps) {
  const initialScenes = useMemo<CanvasScene[]>(
    () => [storyboard.hook, ...storyboard.scenes, storyboard.cta],
    [storyboard]
  );

  const [scenes, setScenes] = useState<CanvasScene[]>(initialScenes);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [globalGenerating, setGlobalGenerating] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [voiceName, setVoiceName] = useState("zh-CN-XiaoxiaoNeural");
  const [transitionMode, setTransitionMode] = useState("");
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskMessage, setTaskMessage] = useState("");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // BGM state
  const [bgmList, setBgmList] = useState<BgmItem[]>([]);
  const [selectedBgm, setSelectedBgm] = useState("");
  const [customBgmBase64, setCustomBgmBase64] = useState<string | null>(null);
  const [customBgmName, setCustomBgmName] = useState<string>("");

  // History state
  const [historyVideos, setHistoryVideos] = useState<HistoryVideo[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const selectedScene = scenes[selectedIndex];
  const allImagesReady = scenes.every((s) => s.imageStatus === "done" && s.imageBase64);
  const anyImageGenerating = scenes.some((s) => s.imageStatus === "generating");

  // Load BGM list and history on mount
  useEffect(() => {
    fetch("/api/video/bgm")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.success && payload.data?.files) {
          setBgmList(payload.data.files);
        }
      })
      .catch(() => {
        // ignore BGM load errors
      });

    loadHistory();
  }, []);

  const loadHistory = useCallback(() => {
    fetch("/api/video/history")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.success && payload.data?.videos) {
          setHistoryVideos(payload.data.videos);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const updateScene = useCallback((index: number, updates: Partial<CanvasScene>) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }, []);

  async function handleSceneImageUpload(index: number, file: File) {
    try {
      const base64 = await fileToBase64(file);
      updateScene(index, { imageBase64: base64, imageStatus: "done" });
      toast.success(`场景 ${index + 1} 图片已上传`);
    } catch {
      toast.error("图片上传失败");
    }
  }

  async function generateSceneImage(index: number) {
    const scene = scenes[index];
    updateScene(index, { imageStatus: "generating" });

    try {
      const response = await fetch("/api/video/scene-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualDesc: scene.visual_desc,
          productImages: productImages.slice(0, 3),
          aspectRatio: (storyboard.video_aspect as any) || "9:16",
        }),
      });

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message || "图片生成失败");
      }

      const b64 = payload.data?.b64Json;
      if (!b64) {
        throw new Error("未返回图片数据");
      }

      updateScene(index, { imageBase64: b64, imageStatus: "done" });
      toast.success(`场景 ${index + 1} 图片生成完成`);
    } catch (error) {
      updateScene(index, { imageStatus: "error" });
      toast.error(error instanceof Error ? error.message : "图片生成失败");
    }
  }

  async function generateAllImages() {
    setGlobalGenerating(true);
    try {
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].imageStatus === "done") continue;
        await generateSceneImage(i);
        await new Promise((r) => setTimeout(r, 500));
      }
      toast.success("所有场景图片生成完毕");
    } finally {
      setGlobalGenerating(false);
    }
  }

  async function handleBgmUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setCustomBgmBase64(base64);
      setCustomBgmName(file.name);
      setSelectedBgm("__custom__");
      toast.success("BGM 已上传");
    } catch {
      toast.error("BGM 上传失败");
    }
  }

  async function synthesizeVideo() {
    if (!allImagesReady) {
      toast.error("请先生成所有场景图片");
      return;
    }

    setSynthesizing(true);
    setVideoResult(null);
    setTaskProgress(0);
    setTaskMessage("正在提交任务...");

    try {
      const sceneImages: Record<string, string> = {};
      scenes.forEach((s) => {
        if (s.imageBase64) sceneImages[String(s.index)] = s.imageBase64;
      });

      const bgmBase64 = selectedBgm === "__custom__" ? customBgmBase64 : null;
      const bgmFileName = selectedBgm === "__custom__" ? customBgmName : null;

      const response = await fetch("/api/video/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboard: {
            title: storyboard.title,
            hook: scenes[0],
            scenes: scenes.slice(1, -1),
            cta: scenes[scenes.length - 1],
            total_duration: storyboard.total_duration,
            bgm_mood: storyboard.bgm_mood,
            style_notes: storyboard.style_notes,
            video_aspect: storyboard.video_aspect,
          },
          sceneImages,
          voiceName,
          voiceRate: 1.0,
          transitionMode: transitionMode || null,
          bgmBase64,
          bgmFileName,
        }),
      });

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error?.message || "视频合成提交失败");
      }

      const taskId: string = payload.data?.taskId;
      if (!taskId) {
        throw new Error("未返回任务 ID");
      }

      setActiveTaskId(taskId);
      toast.info("视频合成任务已提交，正在后台处理...");

      // Start polling
      await pollTask(taskId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "视频合成失败");
      setSynthesizing(false);
      setActiveTaskId(null);
    }
  }

  async function pollTask(taskId: string) {
    const maxAttempts = 120; // ~6 minutes
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));

      try {
        const res = await fetch(`/api/video/tasks/${taskId}`);
        const payload = await res.json();
        if (!payload.success) continue;

        const task = payload.data || payload;
        setTaskProgress(task.progress || 0);
        setTaskMessage(task.message || "处理中...");

        if (task.status === "completed") {
          // Download video from MPT to local storage
          const downloadRes = await fetch("/api/video/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId }),
          });
          const dlPayload = await downloadRes.json();
          if (!dlPayload.success) {
            throw new Error(dlPayload.error?.message || "视频下载失败");
          }

          setVideoResult(dlPayload.data);
          loadHistory();
          toast.success("视频合成完成");
          setSynthesizing(false);
          setActiveTaskId(null);
          return;
        }

        if (task.status === "failed") {
          throw new Error(task.message || "视频合成失败");
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("视频合成失败")) {
          throw error;
        }
        // Ignore polling errors and retry
      }
    }

    throw new Error("视频合成超时，请稍后到历史视频中查看结果");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onExit}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
          <div>
            <h2 className="text-lg font-semibold">视频画布</h2>
            <p className="text-xs text-muted-foreground">
              {storyboard.title || "未命名"} · {scenes.length} 个场景 · {storyboard.total_duration?.toFixed(1)}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
            <History className="mr-1 h-4 w-4" />
            历史视频
          </Button>
          <Badge variant="outline" className={allImagesReady ? "text-emerald-600" : ""}>
            {scenes.filter((s) => s.imageStatus === "done").length}/{scenes.length} 图片就绪
          </Badge>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={generateAllImages}
          disabled={globalGenerating || anyImageGenerating}
        >
          {globalGenerating ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-4 w-4" />
          )}
          一键生成所有图片
        </Button>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Music className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs dark:bg-black/30"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
          >
            {VOICES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Film className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs dark:bg-black/30"
            value={transitionMode}
            onChange={(e) => setTransitionMode(e.target.value)}
          >
            {TRANSITIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* BGM selector */}
        <div className="flex items-center gap-2">
          <Music className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs dark:bg-black/30"
            value={selectedBgm}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedBgm(val);
              if (val !== "__custom__") {
                setCustomBgmBase64(null);
                setCustomBgmName("");
              }
            }}
          >
            <option value="">无 BGM</option>
            {bgmList.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
            <option value="__custom__">上传自定义...</option>
          </select>
          {selectedBgm === "__custom__" && (
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              <input type="file" accept="audio/*" className="hidden" onChange={handleBgmUpload} />
            </label>
          )}
          {customBgmName && <span className="text-[10px] text-muted-foreground">{customBgmName}</span>}
        </div>

        <div className="flex-1" />

        <Button
          size="sm"
          onClick={synthesizeVideo}
          disabled={synthesizing || !allImagesReady}
          className="gap-1"
        >
          {synthesizing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          合成视频
        </Button>

        {synthesizing && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{taskMessage}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scene timeline */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="text-sm font-medium">场景时间轴</h3>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {scenes.map((scene, i) => (
              <div
                key={scene.index}
                draggable
                onDragStart={() => setDraggedIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIndex === null || draggedIndex === i) return;
                  const newScenes = [...scenes];
                  const [removed] = newScenes.splice(draggedIndex, 1);
                  newScenes.splice(i, 0, removed);
                  setScenes(newScenes);
                  setDraggedIndex(null);
                  // Adjust selected index if needed
                  if (selectedIndex === draggedIndex) {
                    setSelectedIndex(i);
                  } else if (selectedIndex > draggedIndex && selectedIndex <= i) {
                    setSelectedIndex(selectedIndex - 1);
                  } else if (selectedIndex < draggedIndex && selectedIndex >= i) {
                    setSelectedIndex(selectedIndex + 1);
                  }
                }}
                onClick={() => setSelectedIndex(i)}
                className={`flex w-full cursor-move items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                  selectedIndex === i
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:bg-muted/40 dark:bg-black/20"
                } ${draggedIndex === i ? "opacity-50" : ""}`}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
                  <span className="text-[10px]">⋮⋮</span>
                </div>
                <SceneThumbnail scene={scene} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[scene.type] || ""}`}>
                      {scene.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      <Clock className="mr-0.5 inline h-3 w-3" />
                      {scene.duration.toFixed(1)}s
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium">{scene.copy}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{scene.visual_desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="space-y-4 lg:col-span-2">
          {selectedScene && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {selectedIndex + 1}
                    </span>
                    场景编辑
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={TYPE_COLORS[selectedScene.type] || ""}>
                      {selectedScene.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Camera className="mr-1 h-3 w-3" />
                      {selectedScene.camera}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image preview */}
                {selectedScene.imageBase64 ? (
                  <div className="relative overflow-hidden rounded-2xl border border-border">
                    <img
                      src={`data:image/jpeg;base64,${selectedScene.imageBase64}`}
                      alt="scene preview"
                      className="w-full object-cover max-h-80"
                    />
                    <button
                      onClick={() => updateScene(selectedIndex, { imageBase64: null, imageStatus: "empty" })}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 py-12">
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">尚未生成场景图片</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Type className="h-3.5 w-3.5" />
                    文案（用于字幕和语音）
                  </Label>
                  <Textarea
                    value={selectedScene.copy}
                    onChange={(e) => updateScene(selectedIndex, { copy: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Wand2 className="h-3.5 w-3.5" />
                    视觉描述（用于生成图片）
                  </Label>
                  <Textarea
                    value={selectedScene.visual_desc}
                    onChange={(e) => updateScene(selectedIndex, { visual_desc: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => generateSceneImage(selectedIndex)}
                    disabled={selectedScene.imageStatus === "generating"}
                  >
                    {selectedScene.imageStatus === "generating" ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-4 w-4" />
                    )}
                    生成图片
                  </Button>

                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Upload className="h-4 w-4" />
                    上传图片
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSceneImageUpload(selectedIndex, file);
                      }}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video result */}
          {videoResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  合成结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <video
                  src={videoResult.url}
                  controls
                  className="w-full rounded-2xl border border-border"
                  style={{ maxHeight: 480 }}
                />
                <div className="flex items-center gap-3">
                  <a
                    href={videoResult.url}
                    download={videoResult.fileName}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white/92 px-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md dark:border-white/10 dark:bg-black/30 dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-white/8 dark:hover:text-white"
                  >
                    <Download className="mr-1 h-4 w-4" />
                    下载视频 ({(videoResult.size / 1024 / 1024).toFixed(2)} MB)
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                已生成视频
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {historyVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无历史视频</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {historyVideos.map((v) => (
                  <div key={v.fileName} className="rounded-2xl border border-border bg-background p-3 dark:bg-black/20">
                    <video
                      src={v.url}
                      className="w-full rounded-xl"
                      style={{ height: 140, objectFit: "cover" }}
                      preload="metadata"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{v.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(v.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                          {new Date(v.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <a
                        href={v.url}
                        download={v.fileName}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 hover:bg-muted"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
