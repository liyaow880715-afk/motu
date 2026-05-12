"use client";

import { useState } from "react";
import { Film, Loader2, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function VideoGenerator() {
  const [rendering, setRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleRender = async () => {
    setRendering(true);
    toast.info("视频渲染已启动，预计需要 2-5 分钟...");

    try {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionId: "TutorialVideo" }),
      });
      const data = await res.json();

      if (data.success) {
        setVideoUrl(data.data.outputPath);
        toast.success("视频渲染完成！");
      } else {
        toast.error(data.error?.message ?? "渲染失败");
      }
    } catch {
      toast.error("网络异常，请重试");
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Film className="h-5 w-5 text-slate-300" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">视频版教程</h3>
          <p className="text-xs text-slate-500">20 秒短视频，快速了解全流程</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRender}
          disabled={rendering}
        >
          {rendering ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              渲染中...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              生成视频教程
            </>
          )}
        </Button>

        {videoUrl && (
          <a
            href={videoUrl}
            download
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Download className="h-4 w-4" />
            下载视频
          </a>
        )}
      </div>

      {videoUrl && (
        <video
          src={videoUrl}
          controls
          className="mt-4 w-full rounded-xl"
          style={{ maxHeight: 500 }}
        />
      )}
    </div>
  );
}
