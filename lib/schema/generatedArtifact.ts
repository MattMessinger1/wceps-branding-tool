import { z } from "zod";
import { SourceEvidenceSchema } from "./brandPack";
import { CreativeBriefSchema } from "./creativeBrief";
import { ReviewStateSchema } from "./reviewState";

export const GeneratedCopySchema = z.object({
  headlineOptions: z.array(z.string()).min(1),
  subheadOptions: z.array(z.string()).min(1),
  body: z.string().min(1),
  bullets: z.array(z.string()).min(1),
  cta: z.string().min(1),
  footer: z.string().optional(),
});

export const FittedCopySchema = z.object({
  headline: z.string().min(1),
  deck: z.string().min(1),
  proofPoints: z.array(z.string()).min(1).max(3),
  cta: z.string().min(1),
  ctaDetail: z.string().optional(),
  footer: z.string().optional(),
});

export const CompositionTemplateSchema = z.object({
  id: z.enum(["campaign-flyer", "magazine-one-pager", "executive-brief", "social-announcement", "email-hero"]),
  artifactType: z.string().min(1),
  aspectRatio: z.string().min(1),
  densityTarget: z.string().min(1),
  typographyScale: z.string().min(1),
  artPlateTreatment: z.string().min(1),
  logoPlacement: z.string().min(1),
  copyPlacement: z.string().min(1),
  ctaPlacement: z.string().min(1),
});

export const DesignRecipeSchema = z.object({
  id: z.enum(["editorial-split", "immersive-poster", "proof-band", "executive-sidecar", "social-poster", "email-strip"]),
  source: z.enum(["app-generated", "model-generated", "imagegen-informed"]).default("app-generated"),
  textZone: z.enum(["left", "right", "center", "lower", "body"]),
  visualZone: z.enum(["full-bleed", "right-field", "left-field", "top-band", "sidecar", "background"]),
  density: z.enum(["minimal", "balanced", "editorial", "dense"]),
  hierarchy: z.string().min(1),
  artDirection: z.string().min(1),
  placeholderStrategy: z.string().min(1),
  appComposition: z.string().min(1),
  promptDirectives: z.array(z.string()).min(1),
});

export const CompositionScoreSchema = z.object({
  question: z.string().min(1),
  overall: z.number().int().min(0).max(100),
  whitespaceDensity: z.number().int().min(0).max(100),
  templateScaffolding: z.number().int().min(0).max(100),
  typographyQuality: z.number().int().min(0).max(100),
  artifactMatch: z.number().int().min(0).max(100),
  brandFidelity: z.number().int().min(0).max(100),
  brandRelevance: z.number().int().min(0).max(100).default(85),
  brandBoundary: z.number().int().min(0).max(100).default(100),
  textIntegration: z.number().int().min(0).max(100),
  fakeContentRisk: z.number().int().min(0).max(100),
  sendability: z.number().int().min(0).max(100),
  status: z.enum(["pass", "warn", "block"]),
  issues: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const LayoutQaSchema = z.object({
  question: z.string().min(1),
  overall: z.number().int().min(0).max(100),
  noTextOverflow: z.number().int().min(0).max(100),
  noCtaCollision: z.number().int().min(0).max(100),
  proofLineWidth: z.number().int().min(0).max(100),
  logoOnce: z.number().int().min(0).max(100),
  artifactFormatMatch: z.number().int().min(0).max(100),
  exportReady: z.number().int().min(0).max(100),
  sendability: z.number().int().min(0).max(100),
  status: z.enum(["pass", "warn", "block"]),
  issues: z.array(z.string()),
  warnings: z.array(z.string()),
  metrics: z.object({
    headlineLines: z.number(),
    deckLines: z.number(),
    maxProofLines: z.number(),
    minProofCharsPerLine: z.number(),
    ctaLines: z.number(),
    estimatedCanvasOverflow: z.boolean(),
  }),
});

export const FailureModeSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  severity: z.enum(["warn", "block"]),
  introducedAt: z.string().min(1),
  missedBy: z.string().optional(),
  message: z.string().min(1),
});

export const StageQaSchema = z.object({
  question: z.string().min(1),
  score: z.number().int().min(0).max(100),
  status: z.enum(["pass", "warn", "block"]),
  issues: z.array(z.string()),
  warnings: z.array(z.string()),
  failureModes: z.array(FailureModeSchema),
  metrics: z.record(z.string(), z.unknown()).optional(),
});

export const GeneratedImageResultSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().min(1),
  size: z.string().min(1),
  quality: z.string().min(1),
  outputFormat: z.string().min(1),
  outputCompression: z.number().optional(),
  dataUrl: z.string().optional(),
  revisedPrompt: z.string().optional(),
  jobId: z.string().optional(),
  braintrustTrace: z
    .object({
      rowId: z.string().optional(),
      spanId: z.string().optional(),
      rootSpanId: z.string().optional(),
      link: z.string().optional(),
    })
    .optional(),
});

export const LayoutContractSchema = z.object({
  artifactType: z.string().min(1),
  canvas: z.string().min(1),
  safeZones: z.array(z.string()).min(1),
  exactTextPriority: z.array(z.string()).min(1),
  appOwnedElements: z.array(z.string()).min(1),
  imageGenOwnedElements: z.array(z.string()).min(1),
});

export const PipelineTraceSchema = z.object({
  version: z.string().min(1),
  mode: z.enum(["image-led-composite", "campaign-art-plate", "design-comp"]).default("image-led-composite"),
  promptLength: z.number().int().nonnegative(),
  promptTokenBudget: z.number().int().positive(),
  evidenceIds: z.array(z.string()),
  logoAsset: z
    .object({
      label: z.string().min(1),
      publicPath: z.string().min(1),
      sourceUrl: z.string().url(),
    })
    .optional(),
  contextAttachmentNames: z.array(z.string()),
  retryCount: z.number().int().nonnegative().default(0),
  failureReason: z.string().optional(),
  braintrustTrace: z
    .object({
      rowId: z.string().optional(),
      spanId: z.string().optional(),
      rootSpanId: z.string().optional(),
      link: z.string().optional(),
    })
    .optional(),
});

export const ArtifactCritiqueSchema = z.object({
  status: z.enum(["pass", "warn", "block"]),
  issues: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestedFixes: z.array(z.string()),
});

export const GeneratedArtifactSchema = z.object({
  id: z.string().min(1),
  artifactType: z.string().min(1),
  brand: z.string().min(1),
  audience: z.string().min(1),
  brief: CreativeBriefSchema,
  copy: GeneratedCopySchema,
  fittedCopy: FittedCopySchema.optional(),
  compositionTemplate: CompositionTemplateSchema.optional(),
  designRecipe: DesignRecipeSchema.optional(),
  compositionScore: CompositionScoreSchema.optional(),
  layoutQa: LayoutQaSchema.optional(),
  copyQualityQa: StageQaSchema.optional(),
  visualQa: StageQaSchema.optional(),
  renderQa: StageQaSchema.optional(),
  failureModes: z.array(FailureModeSchema).optional(),
  artPlatePromptVersion: z.string().optional(),
  layoutContract: LayoutContractSchema.optional(),
  imagePrompts: z.array(z.string()),
  imageResults: z.array(GeneratedImageResultSchema).optional(),
  pipelineTrace: PipelineTraceSchema.optional(),
  critique: ArtifactCritiqueSchema.optional(),
  review: ReviewStateSchema,
  request: z.unknown().optional(),
  sourceEvidence: z.array(SourceEvidenceSchema).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().optional(),
});

export type GeneratedCopy = z.infer<typeof GeneratedCopySchema>;
export type FittedCopy = z.infer<typeof FittedCopySchema>;
export type CompositionTemplate = z.infer<typeof CompositionTemplateSchema>;
export type DesignRecipe = z.infer<typeof DesignRecipeSchema>;
export type CompositionScore = z.infer<typeof CompositionScoreSchema>;
export type LayoutQa = z.infer<typeof LayoutQaSchema>;
export type FailureMode = z.infer<typeof FailureModeSchema>;
export type StageQa = z.infer<typeof StageQaSchema>;
export type GeneratedImageResult = z.infer<typeof GeneratedImageResultSchema>;
export type LayoutContract = z.infer<typeof LayoutContractSchema>;
export type PipelineTrace = z.infer<typeof PipelineTraceSchema>;
export type ArtifactCritique = z.infer<typeof ArtifactCritiqueSchema>;
export type GeneratedArtifact = z.infer<typeof GeneratedArtifactSchema>;
