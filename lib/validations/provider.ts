import { z } from "zod";

export const providerInputSchema = z.object({
  name: z.string().trim().min(2, "请输入 Provider 名称"),
  baseUrl: z.string().trim().url("请输入有效的 baseURL"),
  apiKey: z.string().trim().optional().default(""),
});

export const providerSaveSchema = providerInputSchema.extend({
  id: z.string().optional(),
  purpose: z.enum(["text", "image"]).default("text"),
  isActive: z.boolean().default(true),
  defaultAssignments: z
    .object({
      analysisModelId: z.string().optional().nullable(),
      planningModelId: z.string().optional().nullable(),
      heroImageModelId: z.string().optional().nullable(),
      detailImageModelId: z.string().optional().nullable(),
      imageEditModelId: z.string().optional().nullable(),
      videoScriptModelId: z.string().optional().nullable(),
      videoVLMModelId: z.string().optional().nullable(),
    })
    .optional(),
  models: z
    .array(
      z.object({
        modelId: z.string(),
        label: z.string(),
        capabilities: z.record(z.string(), z.unknown()).optional(),
        roles: z.record(z.string(), z.unknown()).optional(),
        quality: z.string().optional().nullable(),
        latency: z.string().optional().nullable(),
        cost: z.string().optional().nullable(),
        isAvailable: z.boolean().optional(),
        endpointSupport: z
          .object({
            imageGeneration: z.string(),
            imageEdit: z.string(),
            note: z.string().optional().nullable(),
          })
          .optional(),
      }),
    )
    .optional(),
});
