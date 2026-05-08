import { z } from "zod";

export const productAnalysisOutputSchema = z.object({
  productName: z.string(),
  category: z.string(),
  subcategory: z.string(),
  material: z.string(),
  color: z.string(),
  detectedStyle: z.string().optional(),
  styleTags: z.array(z.string()),
  targetAudience: z.array(z.string()),
  usageScenarios: z.array(z.string()),
  coreSellingPoints: z.array(z.string()),
  differentiationPoints: z.array(z.string()),
  userConcerns: z.array(z.string()),
  recommendedFocusPoints: z.array(z.string()),
  suggestedSectionPlan: z.array(
    z.object({
      type: z.string(),
      title: z.string(),
      goal: z.string(),
    }),
  ),
  adLawCategory: z.string().optional(),
  adLawRisks: z.array(
    z.object({
      field: z.string(),
      risk: z.string(),
      suggestion: z.string(),
    }),
  ).optional(),
  nutritionFacts: z.record(z.string(), z.string()).optional(),
});

export type ProductAnalysisOutput = z.infer<typeof productAnalysisOutputSchema>;
