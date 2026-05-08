"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ImageIcon, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PRESET_STYLES = [
  { id: "white", label: "白底简约", desc: "高端简约白底图，产品居中，柔和影棚光" },
  { id: "lifestyle", label: "生活场景", desc: "产品摆放在木质桌面，自然窗光，温暖氛围" },
  { id: "street", label: "户外街拍", desc: "模特手持产品，城市背景虚化，时尚杂志感" },
  { id: "minimal", label: "极简艺术", desc: "纯色渐变背景，产品悬浮，柔和阴影" },
  { id: "gift", label: "礼盒开箱", desc: "产品放置在精美包装中，丝带装饰" },
  { id: "flatlay", label: "俯拍平铺", desc: "产品与配件整齐排列，ins 风" },
  { id: "dark", label: "暗黑高级", desc: "黑色背景，聚光灯，金属光泽，科技风" },
  { id: "cozy", label: "温馨居家", desc: "产品放在沙发/床头，暖黄灯光" },
];

interface HeroBatchGeneratorProps {
  projectId: string;
}

export function HeroBatchGenerator({ projectId }: HeroBatchGeneratorProps) {
  const router = useRouter();
  const [showPanel, setShowPanel] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Array<{ index: number; style: string; success: boolean; assetId?: string; error?: string }> | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["white", "lifestyle", "street", "minimal"]);

  const toggleStyle = (id: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      if (prev.length >= 8) return prev;
      return [...prev, id];
    });
  };

  const handleGenerate = useCallback(async () => {
    if (selectedStyles.length < 2) {
      toast.error("请至少选择 2 种风格");
      return;
    }

    const styles = selectedStyles.map((id) => PRESET_STYLES.find((s) => s.id === id)?.desc ?? "").filter(Boolean);

    setRunning(true);
    setResults(null);
    toast.info(`开始批量生成 ${styles.length} 张头图，请耐心等待...`);

    try {
      const res = await fetch(`/api/projects/${projectId}/hero-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: styles.length, styles }),
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.data.results);
        const successCount = data.data.generatedCount;
        if (successCount === styles.length) {
          toast.success(`全部 ${successCount} 张头图生成完成！`);
        } else {
          toast.warning(`${successCount}/${styles.length} 张生成成功`);
        }
        router.refresh();
      } else {
        throw new Error(data.error?.message ?? "生成失败");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败");
    } finally {
      setRunning(false);
    }
  }, [projectId, selectedStyles, router]);

  return (
    <div>
      <Button variant="outline" onClick={() => { setShowPanel((v) => !v); setResults(null); }}>
        <Sparkles className="mr-2 h-4 w-4" />
        批量生成头图
      </Button>

      {showPanel && (
        <Card className="mt-3 overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">选择风格（{selectedStyles.length} 种）</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PRESET_STYLES.map((style) => {
                  const selected = selectedStyles.includes(style.id);
                  return (
                    <button
                      key={style.id}
                      onClick={() => toggleStyle(style.id)}
                      disabled={running}
                      className={`rounded-xl border p-2 text-left text-xs transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium">{style.label}</div>
                      <div className="mt-0.5 text-muted-foreground line-clamp-2">{style.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={running || selectedStyles.length < 2}
              className="w-full"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  生成 {selectedStyles.length} 张头图
                </>
              )}
            </Button>

            {results && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">生成结果</h4>
                <div className="space-y-1.5">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] shrink-0">头图 {i + 1}</Badge>
                      <span className="truncate text-muted-foreground">{r.style}</span>
                      {r.error && <span className="text-red-500 shrink-0">({r.error})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
