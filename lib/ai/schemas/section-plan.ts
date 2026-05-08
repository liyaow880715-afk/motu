import { z } from "zod";

const sectionPlanItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  goal: z.string(),
  mainTitle: z.string().optional(),
  subTitle: z.string().optional(),
  layout: z.string().optional(),
  visualDescription: z.string().optional(),
  copy: z.string(),
  visualPrompt: z.string(),
  negativePrompt: z.string().optional(),
  colorScheme: z.object({
    primary: z.array(z.array(z.string())),
    secondary: z.array(z.array(z.string())),
    accent: z.array(z.array(z.string())),
  }).optional(),
  whitespaceRatio: z.number().optional(),
  editableFields: z.record(z.string(), z.any()).default({}),
});

export const sectionPlanOutputSchema = z
  .union([
    z.object({
      sections: z.array(sectionPlanItemSchema),
    }),
    z.array(sectionPlanItemSchema),
    z.object({
      data: z.object({
        sections: z.array(sectionPlanItemSchema),
      }),
    }),
    z.object({
      result: z.object({
        sections: z.array(sectionPlanItemSchema),
      }),
    }),
  ])
  .transform((value) => {
    if (Array.isArray(value)) {
      return { sections: value };
    }
    if ("sections" in value) {
      return { sections: value.sections };
    }
    if ("data" in value) {
      return { sections: value.data.sections };
    }
    return { sections: value.result.sections };
  });

export type SectionPlanOutput = z.infer<typeof sectionPlanOutputSchema>;
