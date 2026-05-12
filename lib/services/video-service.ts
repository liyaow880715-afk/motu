import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/utils/crypto";

const MPT_BASE_URL = process.env.MPT_BASE_URL || "http://localhost:8080";

export type VideoProviderConfig = {
  llm_provider: string;
  llm_api_key: string;
  llm_model_name: string;
  llm_base_url: string;
  vlm_provider: string;
  vlm_api_key: string;
  vlm_model_name: string;
  vlm_base_url: string;
};

export type ProductInput = {
  product_images: string[];
  prompt: string;
  target_duration?: number;
  style?: string;
  audience?: string;
  video_aspect?: string;
  video_count?: number;
};

export type StoryboardData = {
  title: string;
  hook: {
    index: number;
    type: string;
    duration: number;
    visual_desc: string;
    copy: string;
    camera: string;
    product_image_index?: number | null;
    material_search_terms?: string[] | null;
    ai_video_prompt?: string | null;
  };
  scenes: Array<{
    index: number;
    type: string;
    duration: number;
    visual_desc: string;
    copy: string;
    camera: string;
    product_image_index?: number | null;
    material_search_terms?: string[] | null;
    ai_video_prompt?: string | null;
  }>;
  cta: {
    index: number;
    type: string;
    duration: number;
    visual_desc: string;
    copy: string;
    camera: string;
    product_image_index?: number | null;
    material_search_terms?: string[] | null;
    ai_video_prompt?: string | null;
  };
  total_duration: number;
  bgm_mood?: string | null;
  style_notes?: string | null;
};

function getProviderNameFromBaseUrl(baseUrl: string): string {
  const url = baseUrl.toLowerCase();
  if (url.includes("moonshot") || url.includes("kimi")) return "moonshot";
  if (url.includes("openai")) return "openai";
  if (url.includes("deepseek")) return "deepseek";
  if (url.includes("gemini") || url.includes("google")) return "gemini";
  if (url.includes("siliconflow")) return "siliconflow";
  if (url.includes("azure")) return "azure";
  return "openai";
}

async function resolveVideoModelConfig(
  role: "videoScript" | "videoVLM"
): Promise<{ provider: { baseUrl: string; apiKey: string }; modelId: string } | null> {
  // Find the provider that has a model marked as default for this role
  const modelProfile = await prisma.modelProfile.findFirst({
    where: role === "videoScript" ? { isDefaultVideoScript: true } : { isDefaultVideoVLM: true },
    include: { providerConfig: true },
  });

  if (!modelProfile) {
    // Fallback: use the active text provider and its first capable model
    const activeProvider = await prisma.providerConfig.findFirst({
      where: { purpose: "text", isActive: true },
      include: { models: true },
    });

    if (!activeProvider) return null;

    const fallbackModel = activeProvider.models.find((m) => {
      const caps = (m.capabilities as Record<string, unknown>) || {};
      if (role === "videoScript") return Boolean(caps.text);
      return Boolean(caps.vision) && Boolean(caps.text);
    });

    if (!fallbackModel) return null;

    return {
      provider: {
        baseUrl: activeProvider.baseUrl,
        apiKey: decryptSecret(activeProvider.apiKeyEncrypted),
      },
      modelId: fallbackModel.modelId,
    };
  }

  return {
    provider: {
      baseUrl: modelProfile.providerConfig.baseUrl,
      apiKey: decryptSecret(modelProfile.providerConfig.apiKeyEncrypted),
    },
    modelId: modelProfile.modelId,
  };
}

export async function getVideoProviderConfig(): Promise<VideoProviderConfig> {
  const [scriptConfig, vlmConfig] = await Promise.all([
    resolveVideoModelConfig("videoScript"),
    resolveVideoModelConfig("videoVLM"),
  ]);

  // If no VLM config, fallback to script config
  const effectiveVlmConfig = vlmConfig || scriptConfig;

  if (!scriptConfig) {
    throw new Error(
      "未找到视频文案模型配置。请先在「AI 配置」页面设置视频模型。"
    );
  }

  const scriptProviderName = getProviderNameFromBaseUrl(scriptConfig.provider.baseUrl);
  const vlmProviderName = effectiveVlmConfig
    ? getProviderNameFromBaseUrl(effectiveVlmConfig.provider.baseUrl)
    : scriptProviderName;

  return {
    llm_provider: scriptProviderName,
    llm_api_key: scriptConfig.provider.apiKey,
    llm_model_name: scriptConfig.modelId,
    llm_base_url: scriptConfig.provider.baseUrl,
    vlm_provider: vlmProviderName,
    vlm_api_key: effectiveVlmConfig?.provider.apiKey || scriptConfig.provider.apiKey,
    vlm_model_name: effectiveVlmConfig?.modelId || scriptConfig.modelId,
    vlm_base_url: effectiveVlmConfig?.provider.baseUrl || scriptConfig.provider.baseUrl,
  };
}

export async function generateStoryboard(productInput: ProductInput): Promise<StoryboardData[]> {
  const providerConfig = await getVideoProviderConfig();

  const response = await fetch(`${MPT_BASE_URL}/storyboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_input: productInput,
      provider_config: providerConfig,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MPT storyboard failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  if (payload.status !== 200 || !payload.data?.storyboards) {
    throw new Error(payload.message || "Storyboard generation failed");
  }

  return payload.data.storyboards as StoryboardData[];
}

export async function analyzeVideo(fileBuffer: Buffer, fileName: string): Promise<{ analysis?: unknown; error?: string }> {
  const providerConfig = await getVideoProviderConfig();

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: "video/mp4" });
  formData.append("file", blob, fileName);
  formData.append("provider_config", JSON.stringify(providerConfig));

  const response = await fetch(`${MPT_BASE_URL}/analyze-video`, {
    method: "POST",
    body: formData as any,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MPT analyze failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload.data || payload;
}
