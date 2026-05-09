"use client";

import React from "react";
import { Upload } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionTypeLabels, type SectionKind, getGenerationLabel } from "./editor-utils";

interface ModuleTreePanelProps {
  sections: any[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
}

export const ModuleTreePanel = React.memo(function ModuleTreePanel({
  sections,
  selectedSectionId,
  onSelectSection,
}: ModuleTreePanelProps) {
  return (
    <Card className="flex min-h-0 min-w-0 flex-col xl:h-[920px]">
      <CardHeader>
        <CardTitle>模块结构树</CardTitle>
        <CardDescription>查看模块顺序、生成状态和当前选中的编辑对象。</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-3 pr-1">
          {sections.map((section: any, index: number) => (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-colors duration-150 hover:bg-muted/40 active:scale-[0.99] ${
                section.id === selectedSectionId
                  ? "border-primary bg-primary/5 dark:border-white/20 dark:bg-white/10"
                  : "border-border bg-white dark:border-white/10 dark:bg-white/[0.04]"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs tracking-[0.18em] text-muted-foreground">#{index + 1}</p>
                    <p className="truncate font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sectionTypeLabels[String(section.type).toLowerCase() as SectionKind] ?? section.type}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1">
                    <StatusBadge value={section.status} />
                    {(section.editableData?.referenceAssetIds as string[] | undefined)?.length ? (
                      <div className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
                        <Upload className="h-2.5 w-2.5" />
                        {(section.editableData.referenceAssetIds as string[]).length}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="max-w-full">
                    <span className="truncate">
                      {sectionTypeLabels[String(section.type).toLowerCase() as SectionKind] ?? section.type}
                    </span>
                  </Badge>
                  {getGenerationLabel(section) ? (
                    <Badge variant={getGenerationLabel(section) === "AI 真图" ? "success" : "outline"} className="max-w-full">
                      <span className="truncate">{getGenerationLabel(section)}</span>
                    </Badge>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
