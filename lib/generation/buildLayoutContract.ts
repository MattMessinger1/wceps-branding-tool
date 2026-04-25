import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";
import type { CreativeBrief } from "@/lib/schema/creativeBrief";
import type { FittedCopy, LayoutContract } from "@/lib/schema/generatedArtifact";
import { isEmailArtifact } from "@/lib/artifacts/artifactOptions";

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function compactText(value: string, maxLength: number) {
  const cleaned = cleanText(value);
  if (cleaned.length <= maxLength) return cleaned;

  const words = cleaned.split(" ");
  const selected: string[] = [];
  for (const word of words) {
    const candidate = [...selected, word].join(" ");
    if (candidate.length > maxLength) break;
    selected.push(word);
  }

  return selected.join(" ").replace(/[.,;:]+$/, "");
}

function canvasForArtifact(artifactType: string) {
  if (artifactType === "social-graphic") return "1024x1024, 1:1 square social campaign tile";
  if (artifactType === "landing-page" || artifactType === "website") {
    return "1536x1024, landscape digital hero / web campaign composition";
  }
  if (isEmailArtifact(artifactType)) return "1200x700, email-safe full-bleed header canvas";

  return "1024x1536, portrait full-page marketing artifact";
}

function safeZonesForArtifact(artifactType: string) {
  if (artifactType === "social-graphic") {
    return [
      "Keep important visual detail away from the outer 96px crop edge.",
      "Use a strong central subject or visual rhythm that supports a social headline.",
      "Avoid tiny details that collapse at feed size.",
    ];
  }

  if (artifactType === "landing-page" || artifactType === "website") {
    return [
      "Create a landscape art field that crops cleanly behind a web hero.",
      "Keep visual contrast varied enough for a deterministic layout layer.",
      "Avoid document-like UI, faux buttons, and dashboard modules.",
    ];
  }
  if (isEmailArtifact(artifactType)) {
    return [
      "Create a wide art field that crops cleanly at email width.",
      "Keep the canvas simple enough for a narrow email module.",
      "Avoid tiny details that disappear at email width.",
    ];
  }

  return [
    "Create a portrait art field with enough texture to support editorial layout.",
    "Keep important visual energy away from trim and crop edges.",
    "Avoid document panels, empty modules, fake cards, or CTA-like shapes.",
  ];
}

export function buildLayoutContract(
  pack: BrandPack,
  brief: CreativeBrief,
  request: ArtifactRequest,
  fittedCopy: FittedCopy,
): LayoutContract {
  const exactTextPriority = [
    fittedCopy.headline,
    `For ${brief.audience}`,
    fittedCopy.cta || request.cta || brief.cta,
    fittedCopy.deck,
    ...fittedCopy.proofPoints.slice(0, brief.artifactType === "social-graphic" ? 1 : 3),
  ]
    .map((item) => compactText(item, brief.artifactType === "social-graphic" ? 72 : 104))
    .filter(Boolean);

  const imageGenOwnedElements =
    brief.artifactType === "social-graphic"
      ? [
          "Text-free square campaign art plate.",
          "Premium abstract or editorial education-sector atmosphere.",
          "Color, texture, photography or illustration, and crop energy only.",
        ]
      : [
          "Text-free full-bleed campaign art plate.",
          "Atmosphere, photography or illustration treatment, color, texture, and crop rhythm.",
          "No document layout, fake cards, panels, contact bars, charts, or text.",
        ];

  const appOwnedElements =
    brief.artifactType === "social-graphic"
      ? [
          "Deterministic social announcement composition.",
          "Exact headline, audience, CTA, and review state.",
        ]
      : [
          `Official ${pack.brandName} logo from approved asset.`,
          "Deterministic grid, typography, headline, audience, and CTA.",
          "Exact support copy and proof hierarchy.",
          "Final export wrapper, source evidence, and review state.",
        ];

  return {
    artifactType: brief.artifactType,
    canvas: canvasForArtifact(brief.artifactType),
    safeZones: safeZonesForArtifact(brief.artifactType),
    exactTextPriority: Array.from(new Set(exactTextPriority)),
    appOwnedElements,
    imageGenOwnedElements,
  };
}
