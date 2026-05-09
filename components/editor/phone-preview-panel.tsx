"use client";

import React from "react";
import { MessageCircle, ShoppingCart, Star } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPreviewConfig,
  getAspectRatioClass,
  getGenerationLabel,
  buildGalleryImages,
  buildCommentCards,
  buildProductDescription,
  previewTexts,
} from "./editor-utils";

interface PhonePreviewPanelProps {
  project: any;
  selectedHeroIndex: number;
  onSelectHeroIndex: (index: number) => void;
  onOpenLightbox: (src: string) => void;
}

export const PhonePreviewPanel = React.memo(function PhonePreviewPanel({
  project,
  selectedHeroIndex,
  onSelectHeroIndex,
  onOpenLightbox,
}: PhonePreviewPanelProps) {
  const previewConfig = React.useMemo(() => getPreviewConfig(project), [project]);
  const previewUi = React.useMemo(() => previewTexts[previewConfig.contentLanguage], [previewConfig.contentLanguage]);
  const galleryImages = React.useMemo(() => buildGalleryImages(project, previewConfig.heroImageCount), [project, previewConfig.heroImageCount]);
  const activeHeroImage = galleryImages[selectedHeroIndex] ?? galleryImages[0] ?? null;
  const comments = React.useMemo(() => buildCommentCards(project.analysis?.normalizedResult), [project.analysis?.normalizedResult]);
  const productDescription = React.useMemo(
    () => buildProductDescription(project.analysis?.normalizedResult, project.sections),
    [project.analysis?.normalizedResult, project.sections]
  );
  const detailSections = React.useMemo(
    () => project.sections.filter((section: any) => section.type !== "HERO"),
    [project.sections]
  );

  return (
    <Card className="flex min-h-0 min-w-0 flex-col xl:h-[920px]">
      <CardHeader>
        <CardTitle>手机商品页预览</CardTitle>
        <CardDescription>头图支持点击切换，详情图无缝衔接，底部栏贴边显示。</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex flex-1 items-stretch justify-center overflow-y-auto overflow-x-hidden">
        <div className="relative flex h-full max-h-full w-[396px] max-w-full flex-col overflow-hidden rounded-[3.2rem] border border-black/70 bg-[radial-gradient(circle_at_top,_#6b7280,_#1f2937_40%,_#030712_100%)] p-[10px] shadow-[0_30px_80px_rgba(15,23,42,0.38)]">
          <div className="pointer-events-none absolute left-1/2 top-[14px] z-20 h-[34px] w-[132px] -translate-x-1/2 rounded-full bg-black shadow-[0_8px_20px_rgba(0,0,0,0.38)]" />
          <div className="absolute left-[6px] top-[160px] h-[96px] w-[4px] rounded-full bg-white/15" />
          <div className="absolute right-[6px] top-[190px] h-[132px] w-[4px] rounded-full bg-white/15" />
          <div className="relative isolate flex h-full flex-col overflow-hidden rounded-[2.55rem] border border-white/10 bg-[#f7f7f7]">
            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <section className="bg-white">
                <div className="overflow-hidden">
                  {galleryImages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="relative aspect-square bg-slate-100">
                        {activeHeroImage ? (
                          <img
                            src={activeHeroImage.url}
                            alt={activeHeroImage.label}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full cursor-zoom-in object-cover"
                            onClick={() => onOpenLightbox(activeHeroImage.url)}
                          />
                        ) : null}
                        {activeHeroImage?.generationLabel ? (
                          <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">{activeHeroImage.generationLabel}</div>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-4 gap-2 px-3 pb-3">
                        {Array.from({ length: previewConfig.heroImageCount }).map((_, index) => {
                          const image = galleryImages[index];
                          const isActive = selectedHeroIndex === index;
                          return (
                            <button
                              key={image?.id ?? `placeholder-${index}`}
                              type="button"
                              onClick={() => image?.url && onSelectHeroIndex(index)}
                              className={`relative aspect-square overflow-hidden rounded-2xl bg-slate-100 ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : ""}`}
                            >
                              {image?.url ? (
                                <>
                                  <img src={image.url} alt={image.label} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                  {image.generationLabel ? (
                                    <div className="absolute inset-x-1 bottom-1 rounded-full bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">{image.generationLabel}</div>
                                  ) : null}
                                </>
                              ) : (
                                <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">{previewUi.heroPlaceholder}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-slate-100 px-6 text-sm text-muted-foreground">{previewUi.heroPlaceholder}</div>
                  )}
                </div>

                <div className="space-y-3 px-4 py-4">
                  <div className="flex items-center gap-2 text-[#ff5a1f]">
                    <span className="text-2xl font-bold">￥{project.analysis?.normalizedResult?.price ?? "??.??"}</span>
                    <span className="rounded-full bg-[#fff1eb] px-2 py-0.5 text-xs">{previewUi.priceTag}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[17px] font-semibold text-slate-900">{project.analysis?.normalizedResult?.productName ?? project.name}</h3>
                    <p className="text-sm leading-6 text-slate-600">{productDescription}</p>
                  </div>
                </div>
              </section>

              <section className="mt-2 bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{previewUi.reviewsTitle}</p>
                    <p className="text-xs text-slate-500">{previewUi.reviewsSubtitle}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[#ff8a00]">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-semibold">4.9</span>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {comments.map((comment, index) => (
                    <div key={`${comment.user}-${index}`} className="rounded-2xl bg-[#faf7f2] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{comment.user}</p>
                        <span className="text-xs text-slate-500">{comment.tag}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-t border-slate-100 bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{previewUi.detailTitle}</p>
                    <p className="text-xs text-slate-500">{previewUi.detailSubtitle(detailSections.length)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">比例 {previewConfig.imageAspectRatio}</span>
                </div>
              </section>

              <div className="space-y-0 pb-0">
                {detailSections.map((section: any) => (
                  <section key={section.id} className="bg-white">
                    {section.imageUrl ? (
                      <div className="relative bg-slate-100">
                        <img
                          src={section.imageUrl}
                          alt={section.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full cursor-zoom-in object-cover"
                          onClick={() => onOpenLightbox(section.imageUrl)}
                        />
                        {getGenerationLabel(section) ? (
                          <div className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">{getGenerationLabel(section)}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className={`flex items-center justify-center bg-slate-100 px-6 text-center text-sm text-muted-foreground ${getAspectRatioClass(previewConfig.imageAspectRatio)}`}>
                        {previewUi.detailPlaceholder}
                      </div>
                    )}
                  </section>
                ))}
                <div className="bg-white px-4 py-4 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Powered by 零禾（上海）网络科技有限公司
                </div>
              </div>
            </div>

            <div className="overflow-hidden border-t border-border bg-transparent">
              <div className="grid w-full grid-cols-[0.78fr_0.92fr_1.15fr_1.15fr] gap-2 px-2 pb-1.5 pt-2">
                <button
                  type="button"
                  className="flex h-10 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98]"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{previewUi.customerService}</span>
                </button>
                <button
                  type="button"
                  className="flex h-10 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98]"
                >
                  <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{previewUi.cart}</span>
                </button>
                <button
                  type="button"
                  className="h-10 min-w-0 overflow-hidden rounded-full bg-[#ffcc55] px-2 text-[11px] font-semibold text-slate-900 transition-colors duration-150 hover:bg-[#ffd700] active:scale-[0.98]"
                >
                  <span className="block truncate">{previewUi.addToCart}</span>
                </button>
                <button
                  type="button"
                  className="h-10 min-w-0 overflow-hidden rounded-full bg-[#ff5a1f] px-2 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-[#ff6b35] active:scale-[0.98]"
                >
                  <span className="block truncate">{previewUi.buyNow}</span>
                </button>
              </div>
              <div className="pb-[max(8px,env(safe-area-inset-bottom))]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
