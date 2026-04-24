import { evaluateLayoutQa, resolveCompositionTemplate, scoreComposition } from "@/lib/composition";
import type { GeneratedArtifact, FittedCopy } from "@/lib/schema/generatedArtifact";

export type TextEditState = {
  headline: string;
  deck: string;
  audienceLabel: string;
  showAudienceLabel: boolean;
  proofPoints: string[];
  cta: string;
};

export function requestRecord(artifact: GeneratedArtifact) {
  return artifact.request && typeof artifact.request === "object" ? (artifact.request as Record<string, unknown>) : {};
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fallbackCopy(artifact: GeneratedArtifact): FittedCopy {
  return {
    headline: artifact.fittedCopy?.headline ?? artifact.copy.headlineOptions[0] ?? artifact.brand,
    deck: artifact.fittedCopy?.deck ?? artifact.copy.subheadOptions[0] ?? artifact.brief.objective,
    proofPoints: artifact.fittedCopy?.proofPoints?.length ? artifact.fittedCopy.proofPoints : artifact.copy.bullets.slice(0, 3),
    cta: artifact.fittedCopy?.cta ?? artifact.copy.cta,
    ctaDetail: artifact.fittedCopy?.ctaDetail,
    footer: artifact.fittedCopy?.footer ?? artifact.copy.footer,
  };
}

function uniqueLeading(value: string, existing: string[]) {
  return [value, ...existing.filter((item) => clean(item) && clean(item) !== value)];
}

function fittedProofPoints(edits: TextEditState, fallback: string[]) {
  const proofPoints = edits.proofPoints.map(clean).filter(Boolean).slice(0, 3);
  return proofPoints.length ? proofPoints : fallback.slice(0, 3);
}

export function getArtifactAudienceLabel(artifact: GeneratedArtifact) {
  const request = requestRecord(artifact);

  if (request.showAudienceLabel === false) {
    return "";
  }

  if (typeof request.audienceLabel === "string") {
    return request.audienceLabel.trim();
  }

  return artifact.audience;
}

export function textEditStateFromArtifact(artifact: GeneratedArtifact): TextEditState {
  const copy = fallbackCopy(artifact);
  const request = requestRecord(artifact);

  return {
    headline: copy.headline,
    deck: copy.deck,
    audienceLabel: getArtifactAudienceLabel(artifact),
    showAudienceLabel: request.showAudienceLabel === false ? false : true,
    proofPoints: copy.proofPoints.slice(0, 3),
    cta: copy.cta,
  };
}

export function applyTextOnlyEdits(artifact: GeneratedArtifact, edits: TextEditState): GeneratedArtifact {
  const existingCopy = fallbackCopy(artifact);
  const headline = clean(edits.headline) || existingCopy.headline;
  const deck = clean(edits.deck) || existingCopy.deck;
  const cta = clean(edits.cta) || existingCopy.cta;
  const proofPoints = fittedProofPoints(edits, existingCopy.proofPoints);
  const audienceLabel = clean(edits.audienceLabel);
  const request = requestRecord(artifact);
  const compositionTemplate = artifact.compositionTemplate ?? resolveCompositionTemplate(artifact.artifactType);
  const fittedCopy: FittedCopy = {
    ...existingCopy,
    headline,
    deck,
    proofPoints,
    cta,
    ctaDetail: existingCopy.ctaDetail,
  };
  const nextRequest = {
    ...request,
    keyMessage: headline,
    cta,
    audienceLabel,
    showAudienceLabel: edits.showAudienceLabel && Boolean(audienceLabel),
    textEdited: true,
  };
  const compositionScore = scoreComposition({
    artifactType: artifact.artifactType,
    fittedCopy,
    template: compositionTemplate,
    prompt: artifact.imagePrompts[0] ?? "",
    request: nextRequest as unknown as Parameters<typeof scoreComposition>[0]["request"],
  });
  const layoutQa = evaluateLayoutQa({
    artifactType: artifact.artifactType,
    template: compositionTemplate,
    fittedCopy,
    request: nextRequest as unknown as Parameters<typeof evaluateLayoutQa>[0]["request"],
  });

  return {
    ...artifact,
    brief: {
      ...artifact.brief,
      cta,
    },
    copy: {
      ...artifact.copy,
      headlineOptions: uniqueLeading(headline, artifact.copy.headlineOptions),
      subheadOptions: uniqueLeading(deck, artifact.copy.subheadOptions),
      bullets: proofPoints,
      cta,
    },
    fittedCopy,
    compositionTemplate,
    compositionScore,
    layoutQa,
    review: {
      ...artifact.review,
      approved: false,
      approvedAt: undefined,
      reviewerName: undefined,
      issues: Array.from(new Set([...artifact.review.issues.filter((issue) => !issue.startsWith("Layout QA: ")), ...layoutQa.issues.map((issue) => `Layout QA: ${issue}`)])),
      warnings: Array.from(new Set([...artifact.review.warnings.filter((warning) => !warning.startsWith("Layout QA: ")), ...layoutQa.warnings.map((warning) => `Layout QA: ${warning}`)])),
    },
    request: nextRequest,
    updatedAt: new Date().toISOString(),
  };
}
