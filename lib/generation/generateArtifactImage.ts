import {
  collectFailureModes,
  evaluateCopyQualityQa,
  evaluateRenderQa,
  evaluateVisualQa,
  resolveCompositionTemplate,
} from "@/lib/composition";
import type { Span } from "braintrust";
import { traceBraintrust, traceBraintrustStep } from "@/lib/observability/braintrust";
import { ArtifactRequestSchema, type ArtifactRequest } from "@/lib/schema/artifactRequest";
import { GeneratedArtifactSchema, type GeneratedArtifact, type GeneratedImageResult, type StageQa } from "@/lib/schema/generatedArtifact";
import { getBackgroundImageJobResult, startBackgroundImageJob } from "./imageJobs";
import { evaluateModelQaWithModel } from "./modelQa";

type GenerateArtifactImageOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
  quality?: string;
  outputFormat?: string;
  outputCompression?: string | number;
};

function imageJobTraceEvent(artifact: GeneratedArtifact, prompt: string, options: GenerateArtifactImageOptions) {
  const size = imageSizeForArtifactType(artifact.artifactType);
  const quality = options.quality ?? "high";
  const outputFormat = options.outputFormat ?? process.env.OPENAI_IMAGE_OUTPUT_FORMAT ?? "webp";
  const outputCompression = options.outputCompression ?? process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION ?? 70;

  return {
    size,
    quality,
    outputFormat,
    outputCompression,
    event: {
      input: {
        artifactId: artifact.id,
        brand: artifact.brand,
        artifactType: artifact.artifactType,
        prompt,
        size,
        quality,
        outputFormat,
        outputCompression,
      },
      metadata: {
        artifactId: artifact.id,
        brand: artifact.brand,
        artifactType: artifact.artifactType,
        promptVersion: artifact.artPlatePromptVersion,
      },
    },
  };
}

const QA_PREFIX_PATTERN = /^(?:Layout|Copy|Visual|Render|Model) QA:/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function imageSizeForArtifactType(artifactType: string) {
  if (artifactType === "social-graphic") return "1024x1024";
  if (artifactType === "landing-page" || artifactType === "website" || artifactType.startsWith("html-email") || artifactType === "email-header") {
    return "1536x1024";
  }
  return "1024x1536";
}

function requestFromArtifact(artifact: GeneratedArtifact): ArtifactRequest {
  const rawRequest = artifact.request && typeof artifact.request === "object" ? (artifact.request as Record<string, unknown>) : {};
  return ArtifactRequestSchema.parse({
    artifactType: artifact.artifactType,
    brand: artifact.brand,
    audience: artifact.audience,
    keyMessage: artifact.fittedCopy?.headline ?? artifact.copy.headlineOptions[0] ?? "",
    topic: artifact.brief.objective || artifact.fittedCopy?.headline || "program overview",
    cta: artifact.fittedCopy?.ctaDetail ?? artifact.fittedCopy?.cta ?? artifact.copy.cta,
    ...rawRequest,
    generateVisual: true,
  });
}

function qaReviewParts(label: string, qa?: StageQa) {
  return {
    warnings: qa?.warnings.map((warning) => `${label} QA: ${warning}`) ?? [],
    issues: qa?.issues.map((issue) => `${label} QA: ${issue}`) ?? [],
    fixes: qa?.issues.map((issue) => `Fix ${label.toLowerCase()} QA: ${issue}`) ?? [],
  };
}

function rebuildReview(artifact: GeneratedArtifact, copyQualityQa: StageQa, visualQa: StageQa, renderQa: StageQa, modelQa: StageQa) {
  const copyParts = qaReviewParts("Copy", copyQualityQa);
  const visualParts = qaReviewParts("Visual", visualQa);
  const renderParts = qaReviewParts("Render", renderQa);
  const modelParts = qaReviewParts("Model", modelQa);
  const existingWarnings = artifact.review.warnings.filter((warning) => !QA_PREFIX_PATTERN.test(warning));
  const existingIssues = artifact.review.issues.filter((issue) => !QA_PREFIX_PATTERN.test(issue));
  const existingFixes = artifact.review.suggestedFixes.filter((fix) => !/^Fix (?:copy|visual|render|layout|model) QA:/i.test(fix));
  const warnings = Array.from(new Set([...existingWarnings, ...copyParts.warnings, ...visualParts.warnings, ...renderParts.warnings, ...modelParts.warnings]));
  const issues = Array.from(new Set([...existingIssues, ...copyParts.issues, ...visualParts.issues, ...renderParts.issues, ...modelParts.issues]));
  const suggestedFixes = Array.from(new Set([...existingFixes, ...copyParts.fixes, ...visualParts.fixes, ...renderParts.fixes, ...modelParts.fixes]));

  return {
    ...artifact.review,
    approved: false,
    approvedAt: undefined,
    status: issues.length ? "block" : warnings.length ? "warn" : "pass",
    issues,
    warnings,
    suggestedFixes,
  };
}

export async function refreshArtifactStageQa(artifact: GeneratedArtifact): Promise<GeneratedArtifact> {
  const request = requestFromArtifact(artifact);
  const template = artifact.compositionTemplate ?? resolveCompositionTemplate(artifact.artifactType);
  const fittedCopy = artifact.fittedCopy;

  if (!fittedCopy) return artifact;

  const copyQualityQa = evaluateCopyQualityQa({ copy: artifact.copy, fittedCopy, request });
  const visualQa = evaluateVisualQa({
    request,
    template,
    imageResults: artifact.imageResults,
    imagePrompts: artifact.imagePrompts,
  });
  const renderQa = evaluateRenderQa({
    fittedCopy,
    template,
    request,
    copyQualityQa,
    visualQa,
    layoutQa: artifact.layoutQa,
  });
  const modelQa = await evaluateModelQaWithModel({
    request,
    copy: artifact.copy,
    fittedCopy,
    template,
    designRecipe: artifact.designRecipe,
    layoutContract: artifact.layoutContract,
    compositionScore: artifact.compositionScore,
    layoutQa: artifact.layoutQa,
    copyQualityQa,
    visualQa,
    renderQa,
    imagePrompts: artifact.imagePrompts,
    imageResults: artifact.imageResults,
  });
  const failureModes = collectFailureModes(copyQualityQa, visualQa, renderQa, modelQa);

  return GeneratedArtifactSchema.parse({
    ...artifact,
    request,
    copyQualityQa,
    visualQa,
    renderQa,
    modelQa,
    failureModes,
    review: rebuildReview(artifact, copyQualityQa, visualQa, renderQa, modelQa),
    updatedAt: new Date().toISOString(),
  });
}

export async function generateImageForArtifact(
  artifact: GeneratedArtifact,
  options: GenerateArtifactImageOptions = {},
): Promise<GeneratedArtifact> {
  return traceBraintrust("imageJob", imageJobTraceEvent(artifact, artifact.imagePrompts[0] ?? "", options).event, (span) =>
    runImageJobForArtifact(artifact, options, span),
  );
}

export async function generateImageForArtifactInTrace(
  artifact: GeneratedArtifact,
  options: GenerateArtifactImageOptions = {},
  parentSpan?: Span,
): Promise<GeneratedArtifact> {
  const prompt = artifact.imagePrompts[0];
  if (!prompt) return await refreshArtifactStageQa(artifact);

  const { event } = imageJobTraceEvent(artifact, prompt, options);

  return traceBraintrustStep(parentSpan, "imageJob", event, (span) => runImageJobForArtifact(artifact, options, span));
}

async function runImageJobForArtifact(
  artifact: GeneratedArtifact,
  options: GenerateArtifactImageOptions,
  span?: Span,
): Promise<GeneratedArtifact> {
  const prompt = artifact.imagePrompts[0];
  if (!prompt) return await refreshArtifactStageQa(artifact);

  const request = requestFromArtifact(artifact);
  const { size, quality, outputFormat, outputCompression } = imageJobTraceEvent(artifact, prompt, options);
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const pollIntervalMs = options.pollIntervalMs ?? 5000;
  const startedAt = Date.now();

      const start = await startBackgroundImageJob(prompt, {
        size,
        quality,
        outputFormat,
        outputCompression,
        brand: artifact.brand,
        contextAttachments: request.contextAttachments,
      });

      let status = start.status;
      let pollCount = 0;
      let imageResult: GeneratedImageResult | undefined;
      let error: unknown;

      while (Date.now() - startedAt < timeoutMs) {
        const result = await getBackgroundImageJobResult(start.jobId, prompt, {
          size,
          quality,
          outputFormat,
          outputCompression,
          brand: artifact.brand,
        });
        pollCount += 1;
        status = result.status;
        error = result.error;

        if (result.imageResult?.dataUrl) {
          imageResult = {
            ...result.imageResult,
            jobId: start.jobId,
            braintrustTrace: span
              ? {
                  rowId: span.id,
                  spanId: span.spanId,
                  rootSpanId: span.rootSpanId,
                  link: span.link(),
                }
              : undefined,
          };
          break;
        }

        if (status === "failed" || status === "cancelled" || status === "incomplete") {
          break;
        }

        await sleep(pollIntervalMs);
      }

      span?.log({
        metadata: {
          artifactId: artifact.id,
          jobId: start.jobId,
          status,
          pollCount,
          elapsedMs: Date.now() - startedAt,
        },
        scores: {
          imageAttached: imageResult?.dataUrl ? 1 : 0,
        },
      });

      if (!imageResult) {
        throw new Error(`ImageGen did not return an image for ${artifact.id}. Status: ${status}${error ? ` ${JSON.stringify(error)}` : ""}`);
      }

      return await refreshArtifactStageQa({
        ...artifact,
        imageResults: [imageResult, ...(artifact.imageResults ?? []).filter((image) => image.dataUrl !== imageResult?.dataUrl)],
      });
}
