import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";

import { ThemeScript } from "@/components/layout/theme-script";
import { BackToTopButton } from "@/components/shared/back-to-top-button";
import { ChunkReloadGuard } from "@/components/shared/chunk-reload-guard";
import { AuthProvider } from "@/components/providers/auth-provider";
import { FetchInterceptor } from "@/components/providers/fetch-interceptor";
import { RootLayoutClient } from "@/components/layout/root-layout-client";
import { ParticleBackground } from "@/components/layout/particle-background";

export const metadata: Metadata = {
  title: "摹图",
  description: "AI 电商详情页生成与编辑工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ParticleBackground />
        <ThemeScript />
        <ChunkReloadGuard />
        <FetchInterceptor />
        <AuthProvider>
          <RootLayoutClient>{children}</RootLayoutClient>
        </AuthProvider>
        <BackToTopButton />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
