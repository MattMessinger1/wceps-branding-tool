import type { ArtifactType } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";

const templateRecommendations: Record<ArtifactType, string> = {
  flyer:
    "Use a one-page flyer with a strong headline, short audience framing, three concise support blocks, a source-grounded proof point, and one clear CTA.",
  "one-pager":
    "Use a structured one-pager with a summary column, key message cards, evidence-backed proof points, and a bottom CTA band.",
  "landing-page":
    "Use a landing page with a first-screen hero, three feature blocks, source-grounded credibility copy, and a repeated CTA.",
  website:
    "Use a compact multi-section website shell with reusable React sections and clear source evidence.",
  "social-graphic":
    "Use a text-light social graphic with one headline, one approved phrase, generous whitespace, and a caption pack.",
  "email-header":
    "Use a narrow header with concise copy, brand-safe image direction, and a CTA line below the image.",
  "html-email-announcement":
    "Use a single-column HTML email announcement with a logo header, concise message, one CTA button, and inline styles.",
  "html-email-newsletter":
    "Use a single-column HTML email newsletter with a logo header, feature story, short update modules, and one CTA button.",
  "html-email-event-invite":
    "Use a single-column HTML event invite with date/context copy, short value statement, and one registration or inquiry CTA.",
  "conference-handout":
    "Use a print-friendly handout with high scan value, practical next steps, and evidence notes.",
  "proposal-cover":
    "Use a polished proposal cover or summary page with a conservative headline, overview, and service fit statement.",
};

export function resolveArtifactTemplate(pack: BrandPack, artifactType: ArtifactType) {
  const preference = pack.artifactPreferences[artifactType] ?? {};
  return {
    artifactType,
    recommendation: templateRecommendations[artifactType],
    preference,
  };
}
