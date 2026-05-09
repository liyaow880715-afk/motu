import { normalizeContentLanguage, type ContentLanguage } from "@/lib/utils/content-language";

export type ImageAspectRatio = "3:4" | "9:16";
export type SectionKind =
  | "hero"
  | "selling_points"
  | "scenario"
  | "detail_closeup"
  | "specs"
  | "material"
  | "comparison"
  | "gift_scene"
  | "brand_trust"
  | "summary"
  | "custom";

export interface PreviewConfig {
  heroImageCount: number;
  detailSectionCount: number;
  imageAspectRatio: ImageAspectRatio;
  contentLanguage: ContentLanguage;
}

export const sectionTypeOptions: SectionKind[] = [
  "hero",
  "selling_points",
  "scenario",
  "detail_closeup",
  "specs",
  "material",
  "comparison",
  "gift_scene",
  "brand_trust",
  "summary",
  "custom",
];

export const sectionTypeLabels: Record<SectionKind, string> = {
  hero: "头图主视觉",
  selling_points: "卖点模块",
  scenario: "场景展示",
  detail_closeup: "细节特写",
  specs: "规格参数",
  material: "材质工艺",
  comparison: "对比说明",
  gift_scene: "送礼场景",
  brand_trust: "品牌信任",
  summary: "总结收口",
  custom: "自定义模块",
};

export const assetTypeLabels: Record<string, string> = {
  MAIN: "主商品图",
  ANGLE: "多角度图",
  DETAIL: "细节图",
  REFERENCE: "参考图",
  GENERATED: "生成图",
  EXPORTED: "导出文件",
};

export const previewTexts: Record<
  ContentLanguage,
  {
    priceTag: string;
    reviewsTitle: string;
    reviewsSubtitle: string;
    detailTitle: string;
    detailSubtitle: (count: number) => string;
    heroPlaceholder: string;
    detailPlaceholder: string;
    customerService: string;
    cart: string;
    addToCart: string;
    buyNow: string;
  }
> = {
  "zh-CN": {
    priceTag: "限时上新",
    reviewsTitle: "用户评价",
    reviewsSubtitle: "高频反馈帮助判断转化说服力",
    detailTitle: "详情展示",
    detailSubtitle: (count) => `按规划顺序展示 ${count} 个详情模块`,
    heroPlaceholder: "预留头图",
    detailPlaceholder: "该模块尚未生成图像",
    customerService: "客服",
    cart: "购物车",
    addToCart: "加入购物车",
    buyNow: "立即购买",
  },
  "en-US": {
    priceTag: "New Arrival",
    reviewsTitle: "Customer Reviews",
    reviewsSubtitle: "Recurring feedback helps judge conversion appeal",
    detailTitle: "Detail Gallery",
    detailSubtitle: (count) => `${count} detail sections shown in planned order`,
    heroPlaceholder: "Hero Slot",
    detailPlaceholder: "This section has not been generated yet",
    customerService: "Service",
    cart: "Cart",
    addToCart: "Add to Cart",
    buyNow: "Buy Now",
  },
  "ja-JP": {
    priceTag: "新着",
    reviewsTitle: "レビュー",
    reviewsSubtitle: "定番の感想から訴求力を確認できます",
    detailTitle: "詳細表示",
    detailSubtitle: (count) => `計画順に ${count} 個の詳細モジュールを表示`,
    heroPlaceholder: "ヘッド画像",
    detailPlaceholder: "このモジュールはまだ生成されていません",
    customerService: "相談",
    cart: "カート",
    addToCart: "カートに追加",
    buyNow: "今すぐ購入",
  },
  "ko-KR": {
    priceTag: "신상품",
    reviewsTitle: "리뷰",
    reviewsSubtitle: "고객들의 생생한 후기를 확인필보세요",
    detailTitle: "상세 정보",
    detailSubtitle: (count) => `기획 순서대로 ${count}개의 상세 모듈 표시`,
    heroPlaceholder: "헤드 이미지",
    detailPlaceholder: "이 모듈은 아직 생성되지 않았습니다",
    customerService: "상담",
    cart: "장바구니",
    addToCart: "장바구니 담기",
    buyNow: "바로 구매",
  },
};

export function getPreviewConfig(project: any): PreviewConfig {
  const config = project?.modelSnapshot?.previewConfig ?? {};
  return {
    heroImageCount: Math.min(5, Math.max(3, Number(config.heroImageCount ?? 4))),
    detailSectionCount: Math.min(10, Math.max(4, Number(config.detailSectionCount ?? 6))),
    imageAspectRatio: config.imageAspectRatio === "3:4" ? "3:4" : "9:16",
    contentLanguage: normalizeContentLanguage(config.contentLanguage),
  };
}

export function getAspectRatioClass(aspectRatio: ImageAspectRatio) {
  return aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[9/16]";
}

export function getGenerationLabel(section: any) {
  const mode = section?.currentImageAsset?.metadata?.mode;
  if (mode === "image_api") return "AI 真图";
  if (mode === "svg_fallback") return "SVG 兜底";
  return null;
}

export function buildGalleryImages(project: any, heroImageCount: number) {
  const heroSections = project.sections.filter((section: any) => section.type === "HERO");
  const uploaded = project.assets.filter((asset: any) => ["MAIN", "ANGLE"].includes(asset.type));
  const plannedHeroImages = heroSections
    .filter((section: any) => Boolean(section.imageUrl))
    .map((section: any, index: number) => ({
      id: section.id,
      url: section.imageUrl,
      label: section.title || `头图 ${index + 1}`,
      generationLabel: section.currentImageAsset?.metadata?.mode === "svg_fallback" ? "SVG 兜底" : "AI 真图",
    }));

  const merged = [
    ...plannedHeroImages,
    ...uploaded.map((asset: any) => ({
      id: asset.id,
      url: asset.url,
      label: assetTypeLabels[asset.type] ?? asset.fileName,
      generationLabel: null,
    })),
  ];

  return merged
    .filter((item, index, list) => item.url && list.findIndex((entry) => entry.url === item.url) === index)
    .slice(0, Math.max(heroImageCount, heroSections.length));
}

export function buildCommentCards(analysis: any) {
  const sellingPoints = analysis?.coreSellingPoints ?? [];
  const concerns = analysis?.userConcerns ?? [];
  const usageScenarios = analysis?.usageScenarios ?? [];

  return [
    {
      user: "晴晴小铺",
      content: sellingPoints[0] ?? "实物完成度很高，视觉表现和细节质感都很在线。",
      tag: usageScenarios[0] ?? "日常搭配",
    },
    {
      user: "晚风买家秀",
      content: sellingPoints[1] ?? "成片效果很稳，用来做商品详情展示很有说服力。",
      tag: usageScenarios[1] ?? "场景展示",
    },
    {
      user: "认真选物的人",
      content: concerns[0]
        ? `原本担心"${concerns[0]}"，到手后发现整体完成度和细节都不错。`
        : "之前顾虑的问题基本都被细节表现打消了，整体体验很满意。",
      tag: "真实反馈",
    },
  ];
}

export function buildProductDescription(analysis: any, sections: any[]) {
  const heroSection = sections.find((section: any) => section.type === "HERO");
  const sellingPoints = (analysis?.coreSellingPoints ?? []).filter(Boolean).slice(0, 2);
  const focusPoints = (analysis?.recommendedFocusPoints ?? []).filter(Boolean).slice(0, 2);
  const styleTags = (analysis?.styleTags ?? []).filter(Boolean).slice(0, 2);

  const candidates = [
    heroSection?.copy,
    ...sellingPoints,
    ...focusPoints,
    styleTags.length > 0 ? `风格关键词：${styleTags.join(" / ")}` : null,
  ]
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);

  if (candidates.length === 0) {
    return "商品描述将由 AI 结合主图、卖点和页面规划自动生成，并同步用于头图与详情图的图内表达。";
  }

  return candidates.join(" · ");
}

export function getActionText(action: string | null) {
  if (action === "generate") return "正在生成当前模块图，请稍候...";
  if (action === "regenerate") return "正在重新生成当前模块图，请稍候...";
  if (action === "repaint") return "正在基于当前图重绘，请稍候...";
  if (action === "enhance") return "正在基于当前图增强，请稍候...";
  return "";
}
