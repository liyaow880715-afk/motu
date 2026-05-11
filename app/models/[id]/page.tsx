"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sparkles, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ModelTemplate {
  id: string;
  name: string;
  description: string | null;
  characterPrompt: string;
  frontViewPath: string;
  backViewPath: string;
  sideViewPath: string;
  bodyType: string | null;
  heightCm: number | null;
  styleTags: string[] | null;
  createdAt: string;
}

interface OutfitShoot {
  id: string;
  name: string;
  clothingType: string;
  resultImages: Array<{ angle: string; filePath: string }> | null;
  sceneStyle: string | null;
  status: string;
  createdAt: string;
}

const bodyTypeLabels: Record<string, string> = {
  slim: "纤瘦",
  average: "标准",
  plus: "丰满",
  athletic: "运动",
};

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [model, setModel] = useState<ModelTemplate | null>(null);
  const [outfits, setOutfits] = useState<OutfitShoot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/models?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setModel(data.data);
          setOutfits(data.data.outfits || []);
        }
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("确定删除这个模特模板吗？相关试衣记录也会被删除。")) return;
    try {
      const res = await fetch(`/api/models?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("已删除");
        router.push("/models");
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || "删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">模特不存在</p>
        <Link href="/models">
          <Button variant="outline" className="mt-4 rounded-2xl">
            返回模特库
          </Button>
        </Link>
      </div>
    );
  }

  const views = [
    { label: "正面", path: model.frontViewPath },
    { label: "背面", path: model.backViewPath },
    { label: "侧面", path: model.sideViewPath },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h1 className="text-xl font-bold">{model.name}</h1>
          {model.bodyType && (
            <Badge variant="outline" className="rounded-full">
              {bodyTypeLabels[model.bodyType] || model.bodyType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/models/${id}/try-on`}>
            <Button className="rounded-2xl gap-2">
              <Sparkles className="h-4 w-4" />
              开始试衣
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="rounded-2xl text-red-500 hover:text-red-600" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 三视图 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {views.map((view) => (
          <div
            key={view.label}
            className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-[#141416]/70"
          >
            <div className="aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-white/5">
              {view.path ? (
                <img src={`/api/files/${view.path}`} alt={view.label} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <User className="h-12 w-12 text-slate-300" />
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
              {view.label}
            </p>
          </div>
        ))}
      </div>

      {/* 模特信息 */}
      <div className="rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-[#141416]/70">
        <h3 className="font-semibold">模特信息</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">人物特征</span>
            <p className="mt-1 text-slate-800 dark:text-slate-200">{model.characterPrompt}</p>
          </div>
          {model.heightCm && (
            <div>
              <span className="text-slate-500">身高</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{model.heightCm} cm</p>
            </div>
          )}
        </div>
        {model.styleTags && (model.styleTags as string[]).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(model.styleTags as string[]).map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 试衣记录 */}
      <div className="space-y-4">
        <h3 className="font-semibold">试衣记录</h3>
        {outfits.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
            <p className="text-sm text-slate-500">还没有试衣记录</p>
            <Link href={`/models/${id}/try-on`}>
              <Button variant="outline" className="mt-4 rounded-2xl gap-2">
                <Sparkles className="h-4 w-4" />
                开始试衣
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outfits.map((outfit) => (
              <div
                key={outfit.id}
                className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-[#141416]/70"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-white/5">
                  {outfit.resultImages && outfit.resultImages[0] ? (
                    <img
                      src={`/api/files/${outfit.resultImages[0].filePath}`}
                      alt={outfit.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {outfit.status === "generating" ? (
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                      ) : (
                        <User className="h-12 w-12 text-slate-300" />
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 px-1">
                  <p className="font-medium text-sm">{outfit.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {outfit.clothingType} · {outfit.sceneStyle || "默认场景"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
