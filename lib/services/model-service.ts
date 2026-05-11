

import { prisma } from "@/lib/db/prisma";
import {
  deleteModelImages,
  deleteOutfitImages,
  readModelImage,
  saveModelImage,
  saveOutfitImage,
} from "@/lib/storage/model-asset-manager";
import { getProviderAdapter } from "@/lib/services/provider-service";
import { env } from "@/lib/utils/env";

// ============ ModelTemplate CRUD ============

export async function listModelTemplates() {
  return prisma.modelTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { outfits: true } },
    },
  });
}

export async function getModelTemplate(id: string) {
  const model = await prisma.modelTemplate.findUnique({
    where: { id },
    include: {
      outfits: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!model) throw new Error("Model template not found");
  return model;
}

export async function createModelTemplate(data: {
  name: string;
  description?: string;
  characterPrompt: string;
  bodyType?: string;
  heightCm?: number;
  styleTags?: string[];
  seed?: string;
}) {
  return prisma.modelTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      characterPrompt: data.characterPrompt,
      frontViewPath: "",
      backViewPath: "",
      sideViewPath: "",
      bodyType: data.bodyType,
      heightCm: data.heightCm,
      styleTags: data.styleTags,
      seed: data.seed,
    },
  });
}

export async function updateModelTemplate(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    characterPrompt: string;
    bodyType: string;
    heightCm: number;
    styleTags: string[];
    seed: string;
  }>
) {
  return prisma.modelTemplate.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteModelTemplate(id: string) {
  await deleteModelImages(id);
  await prisma.modelTemplate.delete({ where: { id } });
}

// ============ OutfitShoot CRUD ============

export async function listOutfitShoots(modelTemplateId: string) {
  return prisma.outfitShoot.findMany({
    where: { modelTemplateId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOutfitShoot(id: string) {
  const shoot = await prisma.outfitShoot.findUnique({
    where: { id },
    include: { modelTemplate: true },
  });
  if (!shoot) throw new Error("Outfit shoot not found");
  return shoot;
}

export async function createOutfitShoot(data: {
  modelTemplateId: string;
  name: string;
  clothingType: string;
  clothingAssets: Array<{ filePath: string; type: string }>;
  sceneStyle?: string;
  accessories?: string[];
  background?: string;
}) {
  return prisma.outfitShoot.create({
    data: {
      modelTemplateId: data.modelTemplateId,
      name: data.name,
      clothingType: data.clothingType,
      clothingAssets: data.clothingAssets,
      sceneStyle: data.sceneStyle,
      accessories: data.accessories,
      background: data.background,
      status: "draft",
    },
  });
}

export async function updateOutfitShoot(
  id: string,
  data: Partial<{
    name: string;
    resultImages: Array<{ angle: string; filePath: string; style?: string }>;
    status: string;
    sceneStyle: string;
    accessories: string[];
    background: string;
  }>
) {
  return prisma.outfitShoot.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteOutfitShoot(id: string) {
  await deleteOutfitImages(id);
  await prisma.outfitShoot.delete({ where: { id } });
}

// ============ AI Generation ============

function buildModelPrompt(basePrompt: string, view: "front" | "back" | "side") {
  const viewDesc = {
    front: "full body front view, facing camera directly, standing straight",
    back: "full body back view, facing away from camera, standing straight",
    side: "full body side profile view, standing straight, body turned 90 degrees",
  };

  return `Professional e-commerce model photo, ${viewDesc[view]}. ${basePrompt}. White/neutral clean background, studio lighting, high quality fashion photography, sharp focus on entire body, 8k resolution.`;
}

function resolveImageModel(
  provider: { models: Array<{ modelId: string; capabilities?: Record<string, unknown> | null; isDefaultHeroImage?: boolean; isDefaultDetailImage?: boolean; isDefaultImageEdit?: boolean }> }
): string {
  // 1. 优先找标记为默认的模型
  const defaults = provider.models.filter(
    (m) => m.isDefaultHeroImage || m.isDefaultDetailImage || m.isDefaultImageEdit
  );
  if (defaults.length > 0) return defaults[0].modelId;

  // 2. fallback 到第一个支持 image_gen 的模型
  const imageCapable = provider.models.find((m) =>
    (m.capabilities?.image_gen as boolean) ||
    (m.capabilities?.real_image_gen as boolean)
  );
  if (imageCapable) return imageCapable.modelId;

  // 3. fallback 到第一个支持 chat-based image 的模型 (image2 系列)
  const chatImage = provider.models.find((m) =>
    /^image2/i.test(m.modelId)
  );
  if (chatImage) return chatImage.modelId;

  throw new Error(
    "未找到可用的图片生成模型。请在 AI 配置中配置一个支持图片生成的模型，并设为默认。"
  );
}

export async function generateModelViews(params: {
  modelId: string;
  characterPrompt: string;
  seed?: string;
}) {
  const { adapter, provider } = await getProviderAdapter("image");
  const imageModel = resolveImageModel(provider);

  const views: ("front" | "back" | "side")[] = ["front", "back", "side"];
  const results: Record<string, string> = {};

  for (const view of views) {
    const prompt = buildModelPrompt(params.characterPrompt, view);

    const result = await adapter.generateImage({
      model: imageModel,
      prompt,
      size: "1024x1536", // 9:16 full body
      aspectRatio: "9:16",
    });

    if (!result.b64Json && !result.url) {
      throw new Error(`Failed to generate ${view} view`);
    }

    const relativePath = await saveModelImage({
      modelId: params.modelId,
      view,
      source: { b64Json: result.b64Json, url: result.url },
    });

    results[view] = relativePath;
  }

  // Update model template with image paths
  await prisma.modelTemplate.update({
    where: { id: params.modelId },
    data: {
      frontViewPath: results.front,
      backViewPath: results.back,
      sideViewPath: results.side,
      updatedAt: new Date(),
    },
  });

  return results;
}


function buildTryOnPrompt(params: {
  clothingType: string;
  sceneStyle?: string;
  accessories?: string[];
  background?: string;
}) {
  const sceneDesc = params.sceneStyle
    ? `${params.sceneStyle} scene`
    : "clean studio scene";

  const accessoryDesc = params.accessories?.length
    ? `with ${params.accessories.join(", ")}`
    : "";

  const bgDesc = params.background
    ? `, ${params.background} background`
    : "";

  return `Virtual try-on: The person in the first reference image is the model. The second reference image shows a specific clothing item (${params.clothingType}) that MUST be worn by the model. CRITICAL: The pattern, colors, textures, prints and design elements of this ${params.clothingType} from the second reference image must be replicated EXACTLY - do not alter, simplify or reinterpret it. In addition to this ${params.clothingType}, design a complete, cohesive outfit (top, bottom, shoes) that perfectly matches and complements its style, color palette and elegance level. All pieces must be harmonious and fashionable. Keep the model's exact face, hairstyle, body shape and skin tone from the first reference image. Professional fashion photography, full body shot, natural pose, sharp details, photorealistic, 8k resolution. ${sceneDesc}${bgDesc}. ${accessoryDesc}.`;
}

export async function generateOutfitShot(params: {
  shootId: string;
  modelTemplateId: string;
  clothingType: string;
  clothingImagePath: string;
  sceneStyle?: string;
  accessories?: string[];
  background?: string;
  aspectRatio?: string;
}) {
  const { adapter, provider } = await getProviderAdapter("image");
  const editModel = resolveImageModel(provider);

  // Read model front view as base image
  const modelImage = await readModelImage(params.modelTemplateId, "front");
  if (!modelImage) {
    throw new Error("Model front view not found");
  }

  // Read clothing image
  const clothingPath = path.resolve(process.cwd(), env.STORAGE_ROOT, params.clothingImagePath);
  let clothingImage: Buffer;
  try {
    clothingImage = await fs.promises.readFile(clothingPath);
  } catch {
    throw new Error("Clothing image not found");
  }

  const modelDataUrl = `data:image/png;base64,${modelImage.toString("base64")}`;
  const clothingDataUrl = `data:image/png;base64,${clothingImage.toString("base64")}`;

  const prompt = buildTryOnPrompt({
    clothingType: params.clothingType,
    sceneStyle: params.sceneStyle,
    accessories: params.accessories,
    background: params.background,
  });

  const ar = params.aspectRatio || "9:16";

  const result = await adapter.generateImage({
    model: editModel,
    prompt,
    aspectRatio: ar as "9:16" | "3:4" | "1:1" | "4:3" | "16:9",
    referenceImages: [modelDataUrl, clothingDataUrl],
  });

  if (!result.b64Json && !result.url) {
    throw new Error("Failed to generate outfit shot");
  }

  const relativePath = await saveOutfitImage({
    shootId: params.shootId,
    angle: "front",
    source: { b64Json: result.b64Json, url: result.url },
  });

  return relativePath;
}

import fs from "fs";
import path from "path";
