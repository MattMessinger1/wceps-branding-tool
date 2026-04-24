import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { CompositionTemplate, FailureMode, FittedCopy, StageQa } from "@/lib/schema/generatedArtifact";
import { cleanQaText, failureMode, hasDanglingFragment, normalizeQaText, repairKnownTruncations, similarIntent, stageQa } from "./qaHelpers";

function ctaDetailDuplicates(copy: FittedCopy) {
  if (!copy.ctaDetail) return false;
  const cta = normalizeQaText(copy.cta);
  const detail = normalizeQaText(copy.ctaDetail);
  return Boolean(cta && detail && (detail === cta || detail.includes(cta) || similarIntent(copy.cta, copy.ctaDetail)));
}

function hasDarkBleed(visualQa?: StageQa) {
  return visualQa?.metrics?.darkEdgeBleedRisk === true || visualQa?.failureModes.some((failure) => failure.id === "dark_edge_bleed") === true;
}

function hasFallback(visualQa?: StageQa) {
  return visualQa?.metrics?.usesFallbackArt === true || visualQa?.failureModes.some((failure) => failure.id === "fallback_art_used") === true;
}

export function evaluateRenderQa({
  fittedCopy,
  template,
  request,
  copyQualityQa,
  visualQa,
}: {
  fittedCopy: FittedCopy;
  template: CompositionTemplate;
  request: ArtifactRequest;
  copyQualityQa?: StageQa;
  visualQa?: StageQa;
}): StageQa {
  const failureModes: FailureMode[] = [];
  const textParts = [fittedCopy.headline, fittedCopy.deck, ...fittedCopy.proofPoints, fittedCopy.cta, fittedCopy.ctaDetail ?? ""].filter(Boolean);
  const awkwardParts = textParts.filter((part) => hasDanglingFragment(part) || repairKnownTruncations(part) !== cleanQaText(part));

  if (ctaDetailDuplicates(fittedCopy)) {
    failureModes.push(
      failureMode(
        "duplicate_cta_detail",
        "block",
        "fitCopy",
        "Rendered CTA repeats the same action in both button and detail text.",
        "layoutQa",
      ),
    );
  }

  if (awkwardParts.length) {
    failureModes.push(
      failureMode(
        "awkward_rendered_text",
        "block",
        "fitCopy",
        `Rendered text has clipped or awkward phrase(s): ${awkwardParts.slice(0, 2).map(cleanQaText).join(" | ")}`,
        "layoutQa",
      ),
    );
  }

  if (hasDarkBleed(visualQa)) {
    failureModes.push(
      failureMode(
        "dark_edge_bleed",
        "block",
        "deterministicLayout",
        "Rendered artifact risks a dark edge bleed instead of a clean designed art field.",
        "layoutQa",
      ),
    );
  }

  if (hasFallback(visualQa) && ["campaign-flyer", "magazine-one-pager"].includes(template.id)) {
    failureModes.push(
      failureMode(
        "fallback_visual_not_export_ready",
        "warn",
        "imageJob",
        "Rendered artifact uses fallback art in a visual-heavy template.",
        "compositionScore",
      ),
    );
  }

  if (template.id === "campaign-flyer" && fittedCopy.proofPoints.length !== 2) {
    failureModes.push(
      failureMode(
        "wrong_proof_count",
        "block",
        "fitCopy",
        "Campaign flyers must render exactly two proof points.",
        "layoutQa",
      ),
    );
  }

  const inheritedBlocks = [...(copyQualityQa?.failureModes ?? []), ...(visualQa?.failureModes ?? [])].filter((failure) => failure.severity === "block");
  const baseScore = inheritedBlocks.length ? 84 : 98;

  return stageQa({
    question: "Would I send this rendered artifact to the WCEPS team without apology?",
    baseScore,
    failureModes,
    metrics: {
      templateId: template.id,
      artifactType: request.artifactType,
      proofPointCount: fittedCopy.proofPoints.length,
      hasCtaDetail: Boolean(fittedCopy.ctaDetail),
      inheritedBlockCount: inheritedBlocks.length,
    },
  });
}
