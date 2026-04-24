import { z } from "zod";

export const SourceEvidenceSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  excerpt: z.string().min(1),
  label: z.string().min(1),
});

export const BrandPackSchema = z.object({
  brandName: z.string().min(1),
  parentBrand: z.string().min(1),
  sourceOfTruth: z.array(z.string().url()).min(1),
  positioning: z.object({
    oneLiner: z.string().min(1),
    summary: z.string().min(1),
    corePillars: z.array(z.string()).min(1),
  }),
  audiences: z
    .array(
      z.object({
        name: z.string().min(1),
        needs: z.array(z.string()),
        approvedMessages: z.array(z.string()).min(1),
        ctaSuggestions: z.array(z.string()).min(1),
      }),
    )
    .min(1),
  proofPoints: z.array(z.string()),
  approvedPhrases: z.array(z.string()).min(1),
  avoidPhrases: z.array(z.string()),
  restrictedClaims: z.array(z.string()),
  topics: z.array(z.string()).min(1),
  visualStyle: z.object({
    colorTokens: z.array(z.string()),
    typographyMood: z.array(z.string()),
    layoutKeywords: z.array(z.string()),
    imageKeywords: z.array(z.string()),
  }),
  artifactPreferences: z.record(z.string(), z.unknown()),
  sourceEvidence: z.array(SourceEvidenceSchema).min(1),
});

export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;
export type BrandPack = z.infer<typeof BrandPackSchema>;
