import { z } from "zod";

export const CreativeBriefSchema = z.object({
  artifactType: z.string().min(1),
  brand: z.string().min(1),
  audience: z.string().min(1),
  objective: z.string().min(1),
  keyMessages: z.array(z.string()).min(1),
  proofPoints: z.array(z.string()),
  cta: z.string().min(1),
  visualDirection: z.array(z.string()).min(1),
  layoutRecommendation: z.string().min(1),
  sourceEvidenceIds: z.array(z.string()).min(1),
});

export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;
