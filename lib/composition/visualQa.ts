import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { CompositionTemplate, FailureMode, GeneratedArtifact, StageQa } from "@/lib/schema/generatedArtifact";
import { failureMode, stageQa } from "./qaHelpers";

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
  const hasBrandCue = request.brand ? promptText.includes(request.brand.toLowerCase()) : true;
  const hasAudienceCue = request.audience ? promptText.includes(request.audience.toLowerCase().split(/\s+/)[0] ?? "") : true;
  const visualRelevance = hasBrandCue && hasAudienceCue ? 94 : hasBrandCue ? 82 : 68;
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
    },
  });
}
