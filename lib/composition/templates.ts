import { isEmailArtifact } from "@/lib/artifacts/artifactOptions";
import type { ArtifactType } from "@/lib/schema/artifactRequest";
import type { CompositionTemplate } from "@/lib/schema/generatedArtifact";

const templates: Record<CompositionTemplate["id"], Omit<CompositionTemplate, "artifactType">> = {
  "campaign-flyer": {
    id: "campaign-flyer",
    aspectRatio: "4:5 portrait",
    densityTarget: "balanced",
    typographyScale: "large campaign headline with compact support proof",
    artPlateTreatment: "full-bleed branded atmosphere cropped into the composition",
    logoPlacement: "top-left, single official logo",
    copyPlacement: "left-led editorial stack with proof band integrated below",
    ctaPlacement: "lower proof band compact action",
  },
  "magazine-one-pager": {
    id: "magazine-one-pager",
    aspectRatio: "letter portrait",
    densityTarget: "editorial",
    typographyScale: "magazine headline, one deck, short proof rail",
    artPlateTreatment: "edge-to-edge editorial art column or band",
    logoPlacement: "top-left, single official logo",
    copyPlacement: "large type block with compact editorial proof band",
    ctaPlacement: "proof band action lockup",
  },
  "executive-brief": {
    id: "executive-brief",
    aspectRatio: "letter portrait",
    densityTarget: "dense",
    typographyScale: "restrained executive hierarchy with tight proof rows",
    artPlateTreatment: "narrow full-height visual field plus branded accent",
    logoPlacement: "top-left, single official logo",
    copyPlacement: "dense report-like editorial grid with priority signal rail",
    ctaPlacement: "footer action bar",
  },
  "social-announcement": {
    id: "social-announcement",
    aspectRatio: "1:1 square",
    densityTarget: "minimal",
    typographyScale: "bold social headline with one support line",
    artPlateTreatment: "full-square art plate with tonal gradient overlay",
    logoPlacement: "top-left, compact brand mark",
    copyPlacement: "center/lower editorial lockup",
    ctaPlacement: "bottom-left short action chip",
  },
  "email-hero": {
    id: "email-hero",
    aspectRatio: "680px email",
    densityTarget: "compact",
    typographyScale: "email-safe headline with concise body text",
    artPlateTreatment: "wide hero art strip with controlled crop",
    logoPlacement: "top header, single official logo",
    copyPlacement: "email body stack with 2 proof rows",
    ctaPlacement: "inline email button",
  },
};

export function resolveCompositionTemplate(artifactType: string): CompositionTemplate {
  let id: CompositionTemplate["id"] = "campaign-flyer";

  if (artifactType === "one-pager") {
    id = "magazine-one-pager";
  } else if (artifactType === "conference-handout" || artifactType === "landing-page" || artifactType === "website") {
    id = "executive-brief";
  } else if (artifactType === "social-graphic") {
    id = "social-announcement";
  } else if (isEmailArtifact(artifactType)) {
    id = "email-hero";
  }

  return {
    ...templates[id],
    artifactType: artifactType as ArtifactType,
  };
}

export function templateProofCount(template: CompositionTemplate) {
  if (template.id === "campaign-flyer") return 2;
  if (template.id === "social-announcement") return 0;
  if (template.id === "email-hero") return 2;
  return 3;
}
