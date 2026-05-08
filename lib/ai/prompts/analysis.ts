import type { ProductAsset } from "@prisma/client";
import { buildAdLawPromptSection } from "@/lib/ai/ad-law-guard";

const requiredJsonShape = `{
  "productName": "string",
  "category": "string",
  "subcategory": "string",
  "material": "string",
  "color": "string",
  "detectedStyle": "string (e.g. 温暖养生·中式食补·现代简约, 科技极简, 奢华高端, 极简北欧)",
  "styleTags": ["string"],
  "targetAudience": ["string"],
  "usageScenarios": ["string"],
  "coreSellingPoints": ["string"],
  "differentiationPoints": ["string"],
  "userConcerns": ["string"],
  "recommendedFocusPoints": ["string"],
  "suggestedSectionPlan": [
    {
      "type": "hero | selling_points | scenario | detail_closeup | specs | material | comparison | gift_scene | brand_trust | summary",
      "title": "string",
      "goal": "string"
    }
  ],
  "adLawCategory": "string (e.g. food, cosmetic, health_food, baby, textile, digital, home, general)",
  "adLawRisks": [
    {
      "field": "string (which field has risk, e.g. coreSellingPoints)",
      "risk": "string (the problematic word or phrase)",
      "suggestion": "string (safer alternative wording)"
    }
  ],
  "nutritionFacts": {
    "热量": "string (e.g. 约XXX大卡/100g)",
    "蛋白质": "string",
    "脂肪": "string",
    "碳水化合物": "string",
    "膳食纤维": "string",
    "钠": "string",
    "其他": "string (any other nutrients)"
  }
}`;

const supportedSectionTypes = [
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
].join(", ");

export function buildProductAnalysisPrompt(assets: ProductAsset[]) {
  const assetSummary = assets
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (asset, index) =>
        `${index + 1}. type=${asset.type}; file=${asset.fileName}; isMain=${asset.isMain ? "yes" : "no"}`,
    )
    .join("\n");

  return [
    "You are a senior e-commerce product strategist and detail-page planner.",
    "Analyze the provided product images and asset hints, then return one strict JSON object only.",
    "Do not output markdown, code fences, explanations, comments, or extra keys.",
    "All copy values should be written in Simplified Chinese.",
    "If some attributes are uncertain, infer the most likely answer from the images and keep the field non-empty.",
    "",
    "Available assets:",
    assetSummary || "No uploaded assets.",
    "",
    "Required rules:",
    "1. Every required key must exist.",
    "2. Every array field must be an array of short Chinese strings.",
    "3. suggestedSectionPlan must contain at least 6 sections.",
    `4. suggestedSectionPlan.type must be one of: ${supportedSectionTypes}.`,
    "5. detectedStyle should be a concise Chinese style description like '温暖养生·中式食补·现代简约' or '科技极简·未来感'.",
    "6. Focus on e-commerce conversion, visual hierarchy, and section planning.",
    "7. All copy (productName, coreSellingPoints, differentiationPoints, etc.) must avoid absolute superlatives (最, 第一, 顶级, 最佳, 唯一, 根治, 治愈, etc.) and false medical/therapeutic claims.",
    "8. adLawCategory must be inferred from the product images (e.g. food, cosmetic, health_food, baby, textile, digital, home, general).",
    "9. adLawRisks must list any detected risky words or phrases found in the analysis output, along with safer alternatives.",
    "10. If the product is food/health-related and nutrition information is visible in the images, populate nutritionFacts with exact values. Do not estimate or guess. If uncertain, leave empty or omit.",
    "",
    "Return exactly this JSON shape:",
    requiredJsonShape,
  ].join("\n");
}

export function buildTextAnalysisPrompt(productInfo: {
  name?: string | null;
  description?: string | null;
  category?: string | null;
  sellingPoints?: string | null;
  targetAudience?: string | null;
}) {
  const adLawSection = buildAdLawPromptSection(
    productInfo.category || "general",
    productInfo.name || "",
  );

  return [
    "You are a senior e-commerce product strategist and detail-page planner.",
    "Based on the provided product text information, analyze and return one strict JSON object only.",
    "Do not output markdown, code fences, explanations, comments, or extra keys.",
    "All copy values should be written in Simplified Chinese.",
    "Infer reasonable values for any missing fields based on the provided information.",
    "",
    "Product Information:",
    `Product Name: ${productInfo.name || "Not specified"}`,
    `Description: ${productInfo.description || "Not specified"}`,
    `Category: ${productInfo.category || "Not specified"}`,
    `Selling Points: ${productInfo.sellingPoints || "Not specified"}`,
    `Target Audience: ${productInfo.targetAudience || "Not specified"}`,
    "",
    "Required rules:",
    "1. Every required key must exist.",
    "2. Every array field must be an array of short Chinese strings (4-10 items each).",
    "3. suggestedSectionPlan must contain at least 8 sections for a complete detail page.",
    `4. suggestedSectionPlan.type must be one of: ${supportedSectionTypes}.`,
    "5. detectedStyle should be a concise Chinese style description (e.g. '温暖养生·中式食补·现代简约', '科技极简·冷色调', '奢华高端·黑金配色'). Infer from product category and selling points.",
    "6. Focus on e-commerce conversion, visual hierarchy, and section planning.",
    "7. If category is food/health, emphasize ingredients, nutrition, and wellness. If tech, emphasize specs and innovation. If fashion, emphasize style and occasion.",
    "8. All copy must avoid absolute superlatives (最, 第一, 顶级, 最佳, 唯一, 根治, 治愈, etc.) and false medical/therapeutic claims.",
    "9. adLawCategory must be inferred from the product category (e.g. food, cosmetic, health_food, baby, textile, digital, home, general).",
    "10. adLawRisks must list any detected risky words or phrases found in the provided sellingPoints/description, along with safer alternatives.",
    "11. If the product is food/health-related, populate nutritionFacts with exact values from the provided sellingPoints/description. Do not estimate or guess. If uncertain, leave empty or omit.",
    adLawSection,
    "",
    "Return exactly this JSON shape:",
    requiredJsonShape,
  ].join("\n");
}

export function buildProductAnalysisRepairPrompt(raw: string) {
  return [
    "You repair malformed product-analysis output into one strict JSON object.",
    "Return JSON only. No markdown, no explanations, no extra keys.",
    "All string values should be in Simplified Chinese when possible.",
    "If a field is missing, infer a reasonable non-empty value from the source content.",
    "If suggestedSectionPlan is missing or too short, create at least 6 valid sections.",
    `Valid section types: ${supportedSectionTypes}.`,
    "",
    "Target JSON shape:",
    requiredJsonShape,
    "",
    "Source content to repair:",
    raw,
  ].join("\n");
}
