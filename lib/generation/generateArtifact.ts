import { loadAllBrandPacks } from "@/lib/brands/loadBrandPack";
import type { Span } from "braintrust";
import { selectBrand } from "@/lib/brands/selectBrand";
import { validateClaims } from "@/lib/brands/validateClaims";
import {
  collectFailureModes,
  evaluateCopyQualityQa,
  evaluateLayoutQa,
  evaluateRenderQa,
  evaluateVisualQa,
  resolveCompositionTemplate,
  scoreComposition,
} from "@/lib/composition";
import { traceBraintrust, traceBraintrustStep } from "@/lib/observability/braintrust";
import { ArtifactRequestSchema, type ArtifactRequest } from "@/lib/schema/artifactRequest";
import { GeneratedArtifactSchema, type GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { resolveArtifactFormat } from "./artifactFormat";
import { buildCreativeBrief } from "./buildCreativeBrief";
import { buildDesignRecipeWithModel, getDesignRecipeModelConfig } from "./buildDesignRecipeWithModel";
import { buildImagePromptContracts } from "./buildImagePrompt";
import { buildLayoutContract } from "./buildLayoutContract";
import { critiqueArtifactQuality } from "./critiqueArtifact";
import { fitCopyWithModel, getCopyFitModelConfig } from "./fitCopyWithModel";
import { generateCopy } from "./generateCopy";
import { evaluateModelQaWithModel, getModelQaConfig } from "./modelQa";

export async function generateArtifactInTrace(input: unknown, span?: Span): Promise<GeneratedArtifact> {
    const parsedRequest = await traceBraintrustStep(span, "parseRequest", { input }, () => ArtifactRequestSchema.parse(input));
    const keyMessage = parsedRequest.keyMessage.trim();
    const artifactFormat = parsedRequest.format || resolveArtifactFormat(parsedRequest.artifactType);
    const request = {
      ...parsedRequest,
      goal: keyMessage ? `Create a ${artifactFormat.toLowerCase()} that communicates: ${keyMessage}` : parsedRequest.goal,
      topic: keyMessage ? keyMessage : parsedRequest.topic,
      format: artifactFormat,
    };
    const packs = await traceBraintrustStep(span, "loadBrandPacks", { metadata: { artifactType: request.artifactType } }, loadAllBrandPacks);
    const resolution = await traceBraintrustStep(span, "selectBrand", { input: request }, () => selectBrand(request, packs));
    const brief = await traceBraintrustStep(span, "buildCreativeBrief", { input: { brand: resolution.selectedBrand.brandName, request } }, () =>
      buildCreativeBrief(resolution.selectedBrand, request),
    );
    const copy = await traceBraintrustStep(span, "generateCopy", { input: { brand: resolution.selectedBrand.brandName, brief, request } }, () =>
      generateCopy(resolution.selectedBrand, brief, request),
    );
    const compositionTemplate = await traceBraintrustStep(span, "resolveCompositionTemplate", { input: request.artifactType }, () =>
      resolveCompositionTemplate(request.artifactType),
    );
    const fittedCopy = await traceBraintrustStep(span, "fitCopy", { input: { copy, request, compositionTemplate }, metadata: getCopyFitModelConfig() }, () =>
      fitCopyWithModel(copy, request, compositionTemplate),
    );
    const designRecipe = await traceBraintrustStep(
      span,
      "buildDesignRecipe",
      { input: { request, compositionTemplate, fittedCopy }, metadata: getDesignRecipeModelConfig() },
      () => buildDesignRecipeWithModel({ request, template: compositionTemplate, fittedCopy }),
    );
    const copyQualityQa = await traceBraintrustStep(
      span,
      "copyQualityQa",
      { input: { copy, fittedCopy, request } },
      () => evaluateCopyQualityQa({ copy, fittedCopy, request }),
    );
    const layoutContract = await traceBraintrustStep(span, "buildLayoutContract", { input: { brand: resolution.selectedBrand.brandName, brief, request, fittedCopy } }, () =>
      buildLayoutContract(resolution.selectedBrand, brief, request, fittedCopy),
    );
    const promptContracts = await traceBraintrustStep(
      span,
      "buildImagePrompt",
      { input: { brand: resolution.selectedBrand.brandName, brief, request, designRecipe } },
      () => buildImagePromptContracts(resolution.selectedBrand, brief, request, copy, layoutContract, designRecipe),
    );
    const imagePrompts = promptContracts.map((contract) => contract.prompt);
    const imageResults: NonNullable<GeneratedArtifact["imageResults"]> = await traceBraintrustStep(
      span,
      "imageJob",
      { input: { generateVisual: request.generateVisual, promptCount: imagePrompts.length } },
      (): NonNullable<GeneratedArtifact["imageResults"]> => [],
    );
    const visualQa = await traceBraintrustStep(
      span,
      "visualQa",
      { input: { request, template: compositionTemplate, imagePromptCount: imagePrompts.length, imageResultCount: imageResults.length } },
      () => evaluateVisualQa({ request, template: compositionTemplate, imageResults, imagePrompts }),
    );
    const review = validateClaims(resolution.selectedBrand, copy);
    const compositionScore = scoreComposition({
      artifactType: request.artifactType,
      fittedCopy,
      template: compositionTemplate,
      prompt: imagePrompts[0] ?? "",
      request,
    });
    const layoutQa = evaluateLayoutQa({
      artifactType: request.artifactType,
      template: compositionTemplate,
      fittedCopy,
      request,
    });
    const renderQa = await traceBraintrustStep(
      span,
      "renderQa",
      { input: { fittedCopy, template: compositionTemplate, copyQualityQa, visualQa } },
      () => evaluateRenderQa({ fittedCopy, template: compositionTemplate, request, copyQualityQa, visualQa, layoutQa }),
    );
    const modelQa = await traceBraintrustStep(
      span,
      "modelQa",
      {
        input: {
          request,
          fittedCopy,
          template: compositionTemplate,
          designRecipe,
          copyQualityQa,
          visualQa,
          renderQa,
          layoutQa,
        },
        metadata: getModelQaConfig(),
      },
      () =>
        evaluateModelQaWithModel({
          request,
          copy,
          fittedCopy,
          template: compositionTemplate,
          designRecipe,
          layoutContract,
          compositionScore,
          layoutQa,
          copyQualityQa,
          visualQa,
          renderQa,
          imagePrompts,
          imageResults,
        }),
    );
    const critique = critiqueArtifactQuality(copy, layoutContract, promptContracts, compositionScore);
    const failureModes = collectFailureModes(copyQualityQa, visualQa, renderQa, modelQa);
    const finalReview = await traceBraintrustStep(
      span,
      "finalReview",
      { input: { review, critique, layoutQa, copyQualityQa, visualQa, renderQa, modelQa, failureModes } },
      () => {
        const warnings = [
          ...review.warnings,
          ...critique.warnings,
          ...layoutQa.warnings.map((warning) => `Layout QA: ${warning}`),
          ...copyQualityQa.warnings.map((warning) => `Copy QA: ${warning}`),
          ...visualQa.warnings.map((warning) => `Visual QA: ${warning}`),
          ...renderQa.warnings.map((warning) => `Render QA: ${warning}`),
          ...modelQa.warnings.map((warning) => `Model QA: ${warning}`),
          ...(resolution.explicit ? [] : [`Brand inferred with ${Math.round(resolution.confidence * 100)}% confidence. ${resolution.explanation}`]),
        ];
        const issues = [
          ...review.issues,
          ...critique.issues,
          ...layoutQa.issues.map((issue) => `Layout QA: ${issue}`),
          ...copyQualityQa.issues.map((issue) => `Copy QA: ${issue}`),
          ...visualQa.issues.map((issue) => `Visual QA: ${issue}`),
          ...renderQa.issues.map((issue) => `Render QA: ${issue}`),
          ...modelQa.issues.map((issue) => `Model QA: ${issue}`),
        ];
        const suggestedFixes = [
          ...review.suggestedFixes,
          ...critique.suggestedFixes,
          ...layoutQa.issues.map((issue) => `Fix layout QA: ${issue}`),
          ...copyQualityQa.issues.map((issue) => `Fix copy QA: ${issue}`),
          ...visualQa.issues.map((issue) => `Fix visual QA: ${issue}`),
          ...renderQa.issues.map((issue) => `Fix render QA: ${issue}`),
          ...modelQa.issues.map((issue) => `Fix model QA: ${issue}`),
        ];

        return {
          ...review,
          status: issues.length ? "block" : warnings.length ? "warn" : review.status,
          issues: Array.from(new Set(issues)),
          warnings: Array.from(new Set(warnings)),
          suggestedFixes: Array.from(new Set(suggestedFixes)),
        };
      },
    );
    const primaryPromptContract = promptContracts[0];
    const now = new Date().toISOString();
    const braintrustTrace = span
      ? {
          rowId: span.id,
          spanId: span.spanId,
          rootSpanId: span.rootSpanId,
          link: span.link(),
        }
      : undefined;

    const artifact = GeneratedArtifactSchema.parse({
      id: `draft-${now.replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`,
      artifactType: request.artifactType,
      brand: resolution.selectedBrand.brandName,
      audience: request.audience,
      brief,
      copy,
      fittedCopy,
      compositionTemplate,
      designRecipe,
      compositionScore,
      layoutQa,
      copyQualityQa,
      visualQa,
      renderQa,
      modelQa,
      failureModes,
      artPlatePromptVersion: primaryPromptContract.version,
      layoutContract,
      imagePrompts,
      imageResults,
      pipelineTrace: {
        version: primaryPromptContract.version ?? "wceps-studio-v1",
        mode: "design-comp",
        promptLength: primaryPromptContract.promptLength,
        promptTokenBudget: primaryPromptContract.promptTokenBudget,
        evidenceIds: primaryPromptContract.evidenceIds,
        logoAsset: primaryPromptContract.logoAsset,
        contextAttachmentNames: primaryPromptContract.contextAttachmentNames,
        retryCount: 0,
        braintrustTrace,
      },
      critique,
      review: finalReview,
      request,
      sourceEvidence: resolution.selectedBrand.sourceEvidence.filter((source) => brief.sourceEvidenceIds.includes(source.id)),
      createdAt: now,
      updatedAt: now,
    });

    span?.log({
      metadata: {
        artifactId: artifact.id,
        brand: artifact.brand,
        artifactType: artifact.artifactType,
        templateId: artifact.compositionTemplate?.id,
        designRecipeId: artifact.designRecipe?.id,
        promptVersion: artifact.artPlatePromptVersion,
        failureModes: artifact.failureModes?.map((failure) => failure.id) ?? [],
      },
      scores: {
        sendability: (artifact.compositionScore?.sendability ?? 0) / 100,
        layoutQa: (artifact.layoutQa?.sendability ?? 0) / 100,
        copyQualityQa: (artifact.copyQualityQa?.score ?? 0) / 100,
        visualQa: (artifact.visualQa?.score ?? 0) / 100,
        renderQa: (artifact.renderQa?.score ?? 0) / 100,
        modelQa: (artifact.modelQa?.score ?? 0) / 100,
        brandBoundary: (artifact.compositionScore?.brandBoundary ?? 0) / 100,
      },
    });

    return artifact;
}

export async function generateArtifact(input: unknown): Promise<GeneratedArtifact> {
  return traceBraintrust("generateArtifact", { input }, (span) => generateArtifactInTrace(input, span));
}
