import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";
import type { CreativeBrief } from "@/lib/schema/creativeBrief";
import type { GeneratedCopy, LayoutContract } from "@/lib/schema/generatedArtifact";
import { isEmailArtifact } from "@/lib/artifacts/artifactOptions";
import { buildPromptContract, type StudioPromptContract } from "./buildPromptContract";

function variantsForArtifact(artifactType: string) {
  if (artifactType === "social-graphic") {
    return [
      "edge-to-edge social campaign art plate with bold color movement, editorial depth, no text, no UI, no layout boxes",
      "premium square education-sector atmosphere with sophisticated crop, human warmth, no typography or brand marks",
      "modern abstract education campaign energy for a feed tile, no brochure, no document elements, no fake symbols",
    ];
  }

  if (artifactType === "landing-page" || artifactType === "website") {
    return [
      "premium landscape campaign art plate with editorial education imagery, layered depth, and sophisticated crop",
      "full-bleed web hero atmosphere with abstract movement, calm institutional authority, and no brand-shape wallpaper",
      "high-end institutional visual field with refined texture, authentic education cues, and no interface elements",
    ];
  }

  if (isEmailArtifact(artifactType)) {
    return [
      "wide email-safe campaign art plate with refined education-sector atmosphere and no email UI",
      "polished newsletter hero visual field with soft color depth, texture, and no rendered text or logo shapes",
      "premium announcement art strip with mobile-email-friendly simplicity and no layout scaffolding",
    ];
  }

  return [
    "portrait full-bleed campaign art plate with polished education-sector storytelling, layered depth, and rich visual density",
    "premium nonprofit education art plate with editorial atmosphere, brand color rhythm, no logo shapes, and no document modules",
    "modern print-crop visual field with refined texture, abstract education energy, and no brochure scaffolding",
  ];
}

export function buildImagePromptContracts(
  pack: BrandPack,
  brief: CreativeBrief,
  request: ArtifactRequest,
  copy: GeneratedCopy,
  layout: LayoutContract,
): StudioPromptContract[] {
  return variantsForArtifact(brief.artifactType).map((variant) => buildPromptContract(pack, brief, request, copy, layout, variant));
}

export function buildImagePrompts(
  pack: BrandPack,
  brief: CreativeBrief,
  request: ArtifactRequest,
  copy: GeneratedCopy,
  layout: LayoutContract,
) {
  return buildImagePromptContracts(pack, brief, request, copy, layout).map((contract) => contract.prompt);
}
