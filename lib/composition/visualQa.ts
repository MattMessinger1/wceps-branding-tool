import { getBrandVisualProfile } from "@/lib/brands/brandVisualProfiles";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { CompositionTemplate, FailureMode, GeneratedArtifact, StageQa } from "@/lib/schema/generatedArtifact";
import { failureMode, stageQa } from "./qaHelpers";

function termInText(text: string, term: string) {
  return text.includes(term.toLowerCase());
}

export function evaluateVisualQa({
  request,
  template,
  imageResults,
  imagePrompts,
  fallbackTone = "light",
}: {
  request: ArtifactRequest;
  template: CompositionTemplate;
  imageResults?: GeneratedArtifact["imageResults"];
  imagePrompts?: string[];
  fallbackTone?: "light" | "dark";
}): StageQa {
  const hasGeneratedVisual = Boolean(imageResults?.some((image) => image.dataUrl));
  const askedForVisual = request.generateVisual === true;
  const usesFallbackArt = !hasGeneratedVisual;
  const missingArtPlate = askedForVisual && !hasGeneratedVisual;
  const darkEdgeBleedRisk = usesFallbackArt && fallbackTone === "dark" && ["campaign-flyer", "magazine-one-pager"].includes(template.id);
  const promptText = (imagePrompts ?? []).join(" ").toLowerCase();
  const revisedPromptText = (imageResults ?? []).map((image) => image.revisedPrompt ?? "").join(" ").toLowerCase();
  const visualText = `${promptText} ${revisedPromptText}`;
  const profile = getBrandVisualProfile(request.brand);
  const missingRequiredTerms = profile.relevanceRequiredTerms.filter((term) => !termInText(visualText, term));
  const missingAvoidTerms = profile.relevanceForbiddenTerms.filter((term) => !termInText(promptText, term));
  const hasBrandCue = request.brand ? promptText.includes(request.brand.toLowerCase()) : true;
  const hasAudienceCue = request.audience ? promptText.includes(request.audience.toLowerCase().split(/\s+/)[0] ?? "") : true;
  const profileCoverage =
    profile.relevanceRequiredTerms.length > 0
      ? 1 - missingRequiredTerms.length / profile.relevanceRequiredTerms.length
      : 1;
  const guardrailCoverage =
    profile.relevanceForbiddenTerms.length > 0
      ? 1 - missingAvoidTerms.length / profile.relevanceForbiddenTerms.length
      : 1;
  const cueScore = hasBrandCue && hasAudienceCue ? 94 : hasBrandCue ? 82 : 68;
  const visualRelevance = Math.round(cueScore * 0.45 + (58 + profileCoverage * 42) * 0.4 + (72 + guardrailCoverage * 28) * 0.15);
  const failureModes: FailureMode[] = [];

  if (missingArtPlate) {
    failureModes.push(
      failureMode(
        "missing_art_plate",
        "block",
        "imageJob",
        "ImageGen was requested, but no generated art plate is attached to the artifact.",
        "layoutQa",
      ),
    );
  } else if (usesFallbackArt) {
    failureModes.push(
      failureMode(
        "fallback_art_used",
        "warn",
        "imageJob",
        "Artifact is using fallback art; treat this as a diagnostic draft, not a completed visual.",
        "layoutQa",
      ),
    );
  }

  if (darkEdgeBleedRisk) {
    failureModes.push(
      failureMode(
        "dark_edge_bleed",
        "block",
        "deterministicLayout",
        "Fallback art can create a dark right-edge bleed in this template.",
        "layoutQa",
      ),
    );
  }

  if (visualRelevance < 80) {
    failureModes.push(
      failureMode(
        "weak_visual_relevance",
        "warn",
        "buildImagePrompt",
        "Visual prompt is missing clear brand or audience cues.",
        "compositionScore",
      ),
    );
  }

  if (missingRequiredTerms.length) {
    failureModes.push(
      failureMode(
        "missing_visual_subject_cues",
        "warn",
        "buildImagePrompt",
        `${profile.brandName} visual prompt is missing subject cue(s): ${missingRequiredTerms.slice(0, 3).join(", ")}.`,
        "visualQa",
      ),
    );
  }

  if (missingAvoidTerms.length) {
    failureModes.push(
      failureMode(
        "missing_visual_avoid_guardrails",
        "warn",
        "buildImagePrompt",
        `${profile.brandName} visual prompt is missing avoid guardrail(s): ${missingAvoidTerms.slice(0, 3).join(", ")}.`,
        "visualQa",
      ),
    );
  }

  return stageQa({
    question: "Would I send this visual system to the WCEPS team without apology?",
    baseScore: visualRelevance,
    failureModes,
    metrics: {
      hasGeneratedVisual,
      usesFallbackArt,
      missingArtPlate,
      darkEdgeBleedRisk,
      visualRelevance,
      promptCount: imagePrompts?.length ?? 0,
      missingRequiredTerms,
      missingAvoidTerms,
    },
  });
}
