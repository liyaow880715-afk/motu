"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/utils/auth-client";

const bodyTypes = [
  { value: "slim", label: "纤瘦" },
  { value: "average", label: "标准" },
  { value: "plus", label: "丰满" },
  { value: "athletic", label: "运动" },
];

const styleTagOptions = [
  "亚洲",
  "欧美",
  "成熟",
  "青春",
  "职业",
  "休闲",
  "甜美",
  "酷飒",
  "短发",
  "长发",
  "黑发",
  "金发",
];

export default function NewModelPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [bodyType, setBodyType] = useState("average");
  const [heightCm, setHeightCm] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  const toggleStyleTag = (tag: string) => {
    setStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !characterPrompt.trim()) {
      toast.error("请填写模特名称和人物特征描述");
      return;
    }

    setGenerating(true);
    setProgress("创建模特模板...");

    try {
      // 1. Create model template
      const createRes = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          characterPrompt,
          bodyType,
          heightCm: heightCm ? parseInt(heightCm) : undefined,
          styleTags,
        }),
      });
      const createData = await createRes.json();
      if (!createData.success) throw new Error(createData.message || "创建失败");

      const modelId = createData.data.id;

      // 2. Generate views
      setProgress("生成正面视图...");
      const genRes = await fetch("/api/models/generate", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          modelId,
          characterPrompt,
        }),
      });
      const genData = await genRes.json();
      if (!genData.success) throw new Error(genData.message || "生成失败");

      toast.success("模特创建成功！");
      router.push(`/models/${modelId}`);
    } catch (err: any) {
      toast.error(err.message || "创建失败");
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-bold">新建模特模板</h1>
      </div>

      <div className="space-y-5 rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-[#141416]/70">
        <div className="space-y-2">
          <Label>模特名称</Label>
          <Input
            placeholder="例如：小雅"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-2xl"
            disabled={generating}
          />
        </div>

        <div className="space-y-2">
          <Label>描述（可选）</Label>
          <Input
            placeholder="简短描述这位模特的特点"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-2xl"
            disabled={generating}
          />
        </div>

        <div className="space-y-2">
          <Label>人物特征描述 *</Label>
          <Textarea
            placeholder="例如：25岁亚洲女性，黑色长发，五官精致，身材标准，气质优雅大方"
            value={characterPrompt}
            onChange={(e) => setCharacterPrompt(e.target.value)}
            className="min-h-[100px] rounded-2xl"
            disabled={generating}
          />
          <p className="text-xs text-slate-500">
            描述越详细，生成的人物一致性越好。建议包含年龄、肤色、发型、五官、体型、气质等。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>体型</Label>
            <div className="flex flex-wrap gap-2">
              {bodyTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setBodyType(t.value)}
                  disabled={generating}
                  className={`rounded-xl px-3 py-2 text-sm transition-all ${
                    bodyType === t.value
                      ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>身高（cm，可选）</Label>
            <Input
              type="number"
              placeholder="170"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="rounded-2xl"
              disabled={generating}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>风格标签</Label>
          <div className="flex flex-wrap gap-2">
            {styleTagOptions.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleStyleTag(tag)}
                disabled={generating}
                className={`rounded-xl px-3 py-1.5 text-xs transition-all ${
                  styleTags.includes(tag)
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {generating && (
          <div className="flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm text-blue-600 dark:text-blue-400">{progress}</span>
          </div>
        )}

        <Button
          className="w-full rounded-2xl gap-2"
          size="lg"
          onClick={handleCreate}
          disabled={generating || !name.trim() || !characterPrompt.trim()}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              生成模特三视图
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
