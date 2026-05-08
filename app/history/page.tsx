"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { RecentProjectList } from "@/components/projects/recent-project-list";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  platform: string;
  style: string;
  sectionCount: number;
  updatedAt: string;
  coverImageUrl?: string | null;
}

function loadStoredKey(): string | null {
  try {
    return localStorage.getItem("bm_access_key");
  } catch {
    return null;
  }
}

export default function HistoryPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = loadStoredKey();
    fetch("/api/projects", {
      headers: key ? { "x-access-key": key } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="历史记录"
        title="最近项目"
        description="按作品墙方式查看已有项目，快速回到分析、规划、编辑或删除不再需要的内容。"
      />

      <Card>
        <CardHeader>
          <CardTitle>项目历史</CardTitle>
          <CardDescription>这里集中展示当前账号下的全部历史项目。</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RecentProjectList initialProjects={projects} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
