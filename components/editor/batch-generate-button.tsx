"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/use-auth-store";
import { getAuthHeaders } from "@/lib/utils/auth-client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Section {
  id: string;
  title: string;
  status?: string;
}

interface BatchGenerateButtonProps {
  projectId: string;
  sections: Section[];
}

export function BatchGenerateButton({ projectId, sections }: BatchGenerateButtonProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showConfirm, setShowConfirm] = useState(false);

  const pendingSections = sections.filter(
    (s) => s.status !== "GENERATING" && s.status !== "SUCCESS",
  );

  const handleBatchGenerate = useCallback(async () => {
    const { keyInfo } = useAuthStore.getState();
    if (keyInfo?.type === "PER_USE") {
      toast.error("次卡不支持生成图片");
      return;
    }

    if (pendingSections.length === 0) {
      toast.info("所有模块已有图片，无需生成");
      return;
    }

    setShowConfirm(true);
  }, [pendingSections.length]);

  const doGenerate = async () => {
    setShowConfirm(false);
    setRunning(true);
    setProgress({ current: 0, total: pendingSections.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingSections.length; i++) {
      const section = pendingSections[i];
      setProgress({ current: i + 1, total: pendingSections.length });

      try {
        const res = await fetch(`/api/projects/${projectId}/sections/${section.id}/generate`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
          console.error(`生成失败 [${section.title}]:`, data.error?.message);
        }
      } catch (error) {
        failCount++;
        console.error(`生成异常 [${section.title}]:`, error);
      }

      // Small delay between requests to avoid rate limiting
      if (i < pendingSections.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setRunning(false);
    setProgress({ current: 0, total: 0 });

    if (failCount === 0) {
      toast.success(`全部 ${successCount} 个模块生成完成！`);
    } else {
      toast.warning(`${successCount} 个成功，${failCount} 个失败`);
    }

    router.refresh();
  };

  if (running) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        生成中 {progress.current}/{progress.total}
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={handleBatchGenerate}>
        <Sparkles className="mr-2 h-4 w-4" />
        一键生成所有图片
      </Button>
      <ConfirmDialog
        open={showConfirm}
        title="一键生成图片"
        description={`确定一键生成 ${pendingSections.length} 个模块的图片？这可能需要几分钟。`}
        confirmText="开始生成"
        cancelText="取消"
        onCancel={() => setShowConfirm(false)}
        onConfirm={doGenerate}
      />
    </>
  );
}
