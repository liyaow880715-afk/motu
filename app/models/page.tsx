"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ModelTemplate {
  id: string;
  name: string;
  description: string | null;
  bodyType: string | null;
  frontViewPath: string;
  _count: { outfits: number };
  createdAt: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setModels(data.data);
      })
      .catch(() => toast.error("加载模特库失败"))
      .finally(() => setLoading(false));
  }, []);

  const bodyTypeLabels: Record<string, string> = {
    slim: "纤瘦",
    average: "标准",
    plus: "丰满",
    athletic: "运动",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">模特库</h1>
          <p className="text-sm text-slate-500 mt-1">创建 AI 模特模板，实现零成本虚拟试衣</p>
        </div>
        <Link href="/models/new">
          <Button className="rounded-2xl gap-2">
            <Plus className="h-4 w-4" />
            新建模特
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-[2rem] bg-slate-100 animate-pulse dark:bg-white/5" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center dark:bg-white/5">
            <User className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="mt-6 text-lg font-semibold">还没有模特模板</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            创建你的第一个 AI 模特，生成三视图后就可以用来虚拟试衣了
          </p>
          <Link href="/models/new" className="mt-6">
            <Button className="rounded-2xl gap-2">
              <Plus className="h-4 w-4" />
              创建模特
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <Link key={model.id} href={`/models/${model.id}`}>
              <div className="group relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-4 shadow-sm transition-all hover:shadow-lg hover:scale-[1.02] dark:border-white/10 dark:bg-[#141416]/70">
                <div className="aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-slate-100 dark:bg-white/5">
                  {model.frontViewPath ? (
                    <img
                      src={`/api/files/${model.frontViewPath}`}
                      alt={model.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <User className="h-16 w-16 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="mt-4 px-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{model.name}</h3>
                    {model.bodyType && (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {bodyTypeLabels[model.bodyType] || model.bodyType}
                      </Badge>
                    )}
                  </div>
                  {model.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{model.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {model._count.outfits} 次试衣 · {new Date(model.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
