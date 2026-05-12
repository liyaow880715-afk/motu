import fs from "fs";
import path from "path";
import { marked } from "marked";
import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { VideoGenerator } from "@/components/guide/video-generator";

export const dynamic = "force-static";

export default function GuidePage() {
  const mdPath = path.join(process.cwd(), "docs", "TUTORIAL.md");
  const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf8") : "教程内容加载失败";
  const html = marked.parse(md) as string;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="text-sm font-medium text-white">摹图</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回登录
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <BookOpen className="h-5 w-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">使用说明</h1>
            <p className="text-xs text-slate-500">AI 设置与生成详情页全流程指南</p>
          </div>
        </div>

        <VideoGenerator />

        <article
          className="prose prose-invert prose-slate max-w-none
            prose-headings:text-white prose-headings:font-semibold
            prose-h1:text-xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3
            prose-h2:text-base prose-h2:border-l-4 prose-h2:border-blue-500 prose-h2:pl-3
            prose-h3:text-sm
            prose-p:text-sm prose-p:text-slate-300 prose-p:leading-relaxed
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white
            prose-code:text-xs prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-[#1e1e1e] prose-pre:rounded-xl prose-pre:p-4
            prose-table:text-xs prose-table:w-full
            prose-th:bg-white/5 prose-th:text-white prose-th:p-2
            prose-td:border-white/10 prose-td:p-2
            prose-tr:border-white/10
            prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
            prose-ul:text-sm prose-ol:text-sm prose-li:text-slate-300
            prose-hr:border-white/10"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Footer CTA */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-slate-300">准备好开始了吗？</p>
          <Link
            href="/login"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-white px-6 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200"
          >
            输入激活码开始使用
          </Link>
        </div>
      </main>
    </div>
  );
}
