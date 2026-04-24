import { boundaryPromptSummary, filterBrandBoundaryEvidence } from "@/lib/brands/brandBoundary";
import { getBrandLogoAsset } from "@/lib/brands/brandAssets";
import { artifactFitNote, getBrandVisualProfile } from "@/lib/brands/brandVisualProfiles";
import { isEmailArtifact } from "@/lib/artifacts/artifactOptions";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack, SourceEvidence } from "@/lib/schema/brandPack";
import type { CreativeBrief } from "@/lib/schema/creativeBrief";
import type { GeneratedCopy, LayoutContract } from "@/lib/schema/generatedArtifact";

export const WCEPS_STUDIO_PROMPT_VERSION = "campaign-art-plate-v5";

export type StudioPromptContract = {
  version: string;
  prompt: string;
  promptLength: number;
  promptTokenBudget: number;
  evidenceIds: string[];
  logoAsset: {
    label: string;
    publicPath: string;
    sourceUrl: string;
  };
  contextAttachmentNames: string[];
};

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function compactText(value: string, maxLength = 120) {
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

function compactList(items: string[], maxItems: number, maxLength = 82) {
  return items.map((item) => compactText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function removeScaffoldCues(items: string[]) {
  const banned = ["card", "sidebar", "panel", "module", "chart", "dashboard", "button", "contact"];
  return items.filter((item) => !banned.some((term) => item.toLowerCase().includes(term)));
}

function profileList(items: string[], maxItems: number, maxLength = 48) {
  return compactList(items, maxItems, maxLength);
}

function keywordCues(value: string, maxItems = 8) {
  const stopWords = new Set([
    "about",
    "after",
    "again",
    "all",
    "and",
    "are",
    "build",
    "for",
    "from",
    "into",
    "our",
    "that",
    "the",
    "their",
    "this",
    "through",
    "with",
    "your",
  ]);

  return Array.from(
    new Set(
      cleanText(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopWords.has(word)),
    ),
  ).slice(0, maxItems);
}

function words(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function scoreEvidence(source: SourceEvidence, request: ArtifactRequest, brief: CreativeBrief) {
  const queryWords = words([
    request.keyMessage,
    request.topic,
    request.goal,
    request.cta,
    brief.audience,
    ...brief.keyMessages,
    ...brief.proofPoints,
  ].join(" "));
  const sourceText = `${source.label} ${source.excerpt}`.toLowerCase();
  let score = 0;

  for (const word of queryWords) {
    if (sourceText.includes(word)) score += 1;
  }

  if (brief.sourceEvidenceIds.includes(source.id)) score += 8;

  return score;
}

export function selectEvidenceForPrompt(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest, maxItems = 2) {
  return filterBrandBoundaryEvidence(pack.brandName, pack.sourceEvidence, request)
    .sort((a, b) => scoreEvidence(b, request, brief) - scoreEvidence(a, request, brief))
    .slice(0, maxItems);
}

function artifactFormatGuard(artifactType: string) {
  if (artifactType === "social-graphic") {
    return "FORMAT=1:1 art plate for a social announcement; never brochure/flyer/one-pager/handout/webpage/contact card.";
  }

  if (artifactType === "landing-page" || artifactType === "website") {
    return "FORMAT=landscape campaign art plate for a deterministic web layout; not print/social.";
  }
  if (isEmailArtifact(artifactType)) return "FORMAT=email-safe campaign art plate; not a print flyer or full webpage.";

  return "FORMAT=portrait campaign art plate for app-composed marketing artifact; not social/web/contact card.";
}

function logoInstruction(artifactType: string, brandName: string) {
  if (artifactType === "social-graphic") {
    return `LOGO=do not render any ${brandName} logo, wordmark, brand initials, logo-like mark, chevron/mountain mark, arrow mark, or background logo pattern; app renders exact brand mark.`;
  }

  return `LOGO=do not render any ${brandName} logo, wordmark, brand initials, logo-like mark, chevron/mountain mark, arrow mark, or background logo pattern; app renders official logo once.`;
}

export function buildPromptContract(
  pack: BrandPack,
  brief: CreativeBrief,
  request: ArtifactRequest,
  copy: GeneratedCopy,
  layout: LayoutContract,
  variant: string,
): StudioPromptContract {
  const isSocial = brief.artifactType === "social-graphic";
  const promptTokenBudget = isSocial ? 4000 : 4800;
  const evidence = selectEvidenceForPrompt(pack, brief, request, isSocial ? 1 : 2);
  const logoAsset = getBrandLogoAsset(pack.brandName);
  const visualProfile = getBrandVisualProfile(pack.brandName);
  const boundary = boundaryPromptSummary(pack.brandName, request);
  const contextAttachmentNames = request.contextAttachments.map((attachment) => attachment.name);
  const keyMessage = cleanText(request.keyMessage || request.topic || copy.headlineOptions[0]);
  const themeCues = keywordCues([keyMessage, request.topic, brief.audience, request.notes, request.visualInstruction].join(" "), isSocial ? 6 : 9);
  const visualCues = compactList(
    [
      ...removeScaffoldCues(pack.visualStyle.imageKeywords),
      ...pack.visualStyle.typographyMood,
    ],
    isSocial ? 3 : 5,
    42,
  );
  const palette = compactList(pack.visualStyle.colorTokens, 4, 32);
  const refs = contextAttachmentNames.length ? contextAttachmentNames.join(", ") : "none";
  const note = request.notes ? compactText(request.notes, 130) : "";
  const visualInstruction = request.visualInstruction ? compactText(request.visualInstruction, 170) : "";
  const appOwned = compactList(layout.appOwnedElements, isSocial ? 2 : 4, 62);
  const imageGenOwned = compactList(layout.imageGenOwnedElements, isSocial ? 3 : 4, 62);
  const safeZones = compactList(layout.safeZones, isSocial ? 3 : 4, 62);
  const preferredSubjects = profileList(visualProfile.preferredSubjects, isSocial ? 4 : 5, 56);
  const contextProps = profileList(visualProfile.contextProps, isSocial ? 3 : 5, 58);
  const avoidSubjects = profileList(visualProfile.avoidSubjects, isSocial ? 4 : 7, 54);
  const appOwnedBrandElements = profileList(visualProfile.appOwnedBrandElements, isSocial ? 3 : 5, 46);
  const profileFit = compactText(artifactFitNote(visualProfile, brief.artifactType), 130);
  const keepBoundary = profileList(boundary.keep, isSocial ? 4 : 6, 44);
  const avoidBoundary = profileList(boundary.avoid, isSocial ? 5 : 8, 48);
  const messageCues = [
    `headline_theme:${themeCues.slice(0, 3).join("/")}`,
    `audience:${brief.audience.length} chars`,
    `cta_intent:${keywordCues(copy.cta || brief.cta, 3).join("/")}`,
    `proof_volume:${isSocial ? "minimal" : "compact"}`,
  ];

  const sections = [
    `CONTRACT=${WCEPS_STUDIO_PROMPT_VERSION}`,
    "MODE=campaign-art-plate",
    `INTENT={out:${brief.artifactType}, brand:${pack.brandName}, aud:${compactText(brief.audience, 54)}, theme:[${themeCues.join(" | ")}], tone:${compactText(request.toneModifier || "professional, warm, practical", 54)}, ground:${request.strictlySourceGrounded ? "strict" : "source-informed"}}`,
    `CANVAS=${layout.canvas}`,
    artifactFormatGuard(brief.artifactType),
    `BRAND={pal:[${palette.join(" | ")}], visual:[${visualCues.join(" | ")}], evid_ids:[${evidence.map((source) => source.id).join(" | ")}]}`,
    `BRAND_BOUNDARY={keep:[${keepBoundary.join(" | ")}]; avoid_sibling:[${avoidBoundary.join(" | ")}]; parent_context:[${profileList(boundary.parentContext, 3, 32).join(" | ")}]}`,
    `BRAND_VISUAL_PROFILE={show:[${preferredSubjects.join(" | ")}]; props:[${contextProps.join(" | ")}]; avoid:[${avoidSubjects.join(" | ")}]; app_owned:[${appOwnedBrandElements.join(" | ")}]; tone:[${profileList(visualProfile.visualTone, 5, 36).join(" | ")}]; fit:${profileFit}}`,
    logoInstruction(brief.artifactType, pack.brandName),
    "MARKS_RULE=official logos, seals, badges, CTAs, headlines, labels, and readable copy are app-owned; do not invent or render them in the art plate.",
    `OWN=app:[${appOwned.join(" | ")}]; imagegen:[${imageGenOwned.join(" | ")}].`,
    `CROP_SAFE=[${safeZones.join(" | ")}]`,
    `MESSAGE_CUES=[${messageCues.join(" | ")}]; mood/subject only, never words/layout.`,
    `REFS=${refs}; references only.`,
    note ? `USER_NOTE=${note}` : "",
    visualInstruction ? `VISUAL_INSTRUCTION=${visualInstruction}` : "",
    `ART=${variant}; NY media/ad-agency quality, premium atmosphere, layered depth, non-generic education storytelling, intentional crop.`,
    "VISUAL_STYLE=authentic editorial photography or refined abstract-illustrative atmosphere; avoid posed training-room stock, washed-out empty fades, generic meeting-table cliches, literal brand-shape wallpaper.",
    "COMPOSITION=app owns layout, typography, text, logos, proof points, CTA, and export; ImageGen creates only the art plate.",
    "TEXT_RULE=absolutely no readable text, letters, numbers, labels, fake paragraphs, book titles, publisher names, email addresses, URLs, phone numbers, citations, or lorem ipsum.",
    "NO=document layouts, panels, blank boxes, placeholder modules, mock UI, cards, fake text, fake charts, icons with labels, contact bars, duplicate logos, fake logos, fake seals, fake badges, fake book titles, fake publisher brands, logo-like marks, wordmarks, chevrons, arrows, mountain logos, malformed UI, brochure scaffolding, invented claims, endorsement imagery, close-up faces, detailed hands, stock-photo workshop posing.",
    "QUALITY=best over fast; polished full-bleed campaign art plate, no template scaffolding.",
  ].filter(Boolean);

  const prompt = sections.join("\n");

  return {
    version: WCEPS_STUDIO_PROMPT_VERSION,
    prompt,
    promptLength: prompt.length,
    promptTokenBudget,
    evidenceIds: evidence.map((source) => source.id),
    logoAsset,
    contextAttachmentNames,
  };
}
