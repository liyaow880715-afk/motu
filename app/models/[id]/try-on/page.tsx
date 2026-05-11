"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Upload, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const clothingTypes = [
  { value: "dress", label: "连衣裙" },
  { value: "top", label: "上衣" },
  { value: "pants", label: "裤子" },
  { value: "skirt", label: "裙子" },
  { value: "lingerie", label: "内衣" },
  { value: "stocking", label: "丝袜" },
  { value: "suit", label: "套装" },
  { value: "coat", label: "外套" },
];

const sceneStyles = [
  { value: "studio", label: "摄影棚" },
  { value: "outdoor", label: "户外街景" },
  { value: "indoor", label: "室内居家" },
  { value: "minimal", label: "极简背景" },
];

const accessoryOptions = [
  "耳环",
  "项链",
  "手链",
  "手表",
  "眼镜",
  "帽子",
  "包包",
  "腰带",
];

export default function TryOnPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [model, setModel] = useState<{ name: string; frontViewPath: string } | null>(null);
  const [clothingType, setClothingType] = useState("dress");
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [clothingImagePath, setClothingImagePath] = useState<string>("");
  const [sceneStyle, setSceneStyle] = useState("studio");
  const [accessories, setAccessories] = useState<string[]>([]);
  const [background, setBackground] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/models?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setModel({ name: data.data.name, frontViewPath: data.data.frontViewPath });
      });
  }, [id]);

  const toggleAccessory = (acc: string) => {
    setAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", "model-upload");
    formData.append("type", "REFERENCE");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setClothingImage(`/api/files/${data.data.filePath}`);
        setClothingImagePath(data.data.filePath);
        toast.success("上传成功");
      }
    } catch {
      toast.error("上传失败");
    }
  };

  const handleGenerate = async () => {
    if (!clothingImagePath) {
      toast.error("请先上传衣服图片");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/models/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelTemplateId: id,
          clothingType,
          clothingImagePath,
          sceneStyle,
          accessories,
          background: background || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("试衣图生成成功！");
        router.push(`/models/${id}`);
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || "生成失败");
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-bold">
          {model ? `为「${model.name}」试衣` : "虚拟试衣"}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：上传衣服 */}
        <div className="space-y-4 rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-[#141416]/70">
          <h3 className="font-semibold text-sm">1. 选择衣服</h3>

          <div className="space-y-2">
            <Label className="text-xs">衣服类型</Label>
            <div className="flex flex-wrap gap-2">
              {clothingTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setClothingType(t.value)}
                  className={`rounded-xl px-3 py-1.5 text-xs transition-all ${
                    clothingType === t.value
                      ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                      : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">上传衣服图片</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50 p-6 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8">
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              {clothingImage ? (
                <img src={clothingImage} alt="clothing" className="h-32 w-32 object-contain" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-slate-400" />
                  <span className="mt-2 text-xs text-slate-500">点击上传衣服平铺图</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* 中间：模特预览 */}
        <div className="space-y-4 rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-[#141416]/70">
          <h3 className="font-semibold text-sm">2. 模特预览</h3>
          <div className="aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-white/5">
            {model?.frontViewPath ? (
              <img
                src={`/api/files/${model.frontViewPath}`}
                alt="model"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <User className="h-16 w-16 text-slate-300" />
              </div>
            )}
          </div>
        </div>

        {/* 右侧：场景配置 */}
        <div className="space-y-4 rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-[#141416]/70">
          <h3 className="font-semibold text-sm">3. 场景配置</h3>

          <div className="space-y-2">
            <Label className="text-xs">场景风格</Label>
            <div className="flex flex-wrap gap-2">
              {sceneStyles.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSceneStyle(s.value)}
                  className={`rounded-xl px-3 py-1.5 text-xs transition-all ${
                    sceneStyle === s.value
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">配饰搭配</Label>
            <div className="flex flex-wrap gap-2">
              {accessoryOptions.map((acc) => (
                <button
                  key={acc}
                  onClick={() => toggleAccessory(acc)}
                  className={`rounded-xl px-3 py-1.5 text-xs transition-all ${
                    accessories.includes(acc)
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">背景描述（可选）</Label>
            <Input
              placeholder="例如：白色背景墙、自然光线"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="rounded-2xl text-xs"
            />
          </div>

          <Button
            className="w-full rounded-2xl gap-2 mt-4"
            size="lg"
            onClick={handleGenerate}
            disabled={generating || !clothingImagePath}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                生成试衣图
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
