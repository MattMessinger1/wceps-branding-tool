import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { CompositionTemplate, DesignRecipe, FittedCopy } from "@/lib/schema/generatedArtifact";

function headlineWordCount(copy: FittedCopy) {
  return copy.headline.split(/\s+/).filter(Boolean).length;
}

function hasVisualSpecificity(request: ArtifactRequest) {
  return Boolean(request.visualInstruction?.trim() || request.contextAttachments.length);
}

export function buildDesignRecipe({
  request,
  template,
  fittedCopy,
}: {
  request: ArtifactRequest;
  template: CompositionTemplate;
  fittedCopy: FittedCopy;
}): DesignRecipe {
  const longHeadline = headlineWordCount(fittedCopy) > 9;
  const visualSpecific = hasVisualSpecificity(request);

  if (template.id === "social-announcement") {
    return {
      id: "social-poster",
      source: "app-generated",
      textZone: "center",
      visualZone: "background",
      density: "minimal",
      hierarchy: "poster-like social hierarchy with one dominant message, one support line, and compact CTA",
      artDirection: "high-impact square concept with strong crop, color rhythm, and enough tonal contrast for centered type",
      placeholderStrategy: "imply type zones through contrast, depth, and negative space; do not draw text boxes or fake labels",
      appComposition: "center/lower text lockup over tonal art plate with one compact official logo",
      promptDirectives: [
        "full social concept composition, not a cropped flyer",
        "strong center/lower quiet zone for app-rendered headline",
        "visual energy should frame the message without fake typography",
      ],
    };
  }

  if (template.id === "email-hero") {
    return {
      id: "email-strip",
      source: "app-generated",
      textZone: "body",
      visualZone: "top-band",
      density: "minimal",
      hierarchy: "email-safe hero strip with clean visual hook and compact body copy below",
      artDirection: "wide polished header concept with brand-specific subject matter and simple mobile-safe crop",
      placeholderStrategy: "create visual hierarchy through subject placement and calm negative space, never email UI or text modules",
      appComposition: "official logo header, art strip, then exact headline, deck, proof rows, and CTA in email-safe markup",
      promptDirectives: [
        "wide hero concept for email, not a full page",
        "avoid fake newsletter modules or button-like shapes",
        "subject matter must stay recognizable at 680px email width",
      ],
    };
  }

  if (template.id === "executive-brief") {
    return {
      id: "executive-sidecar",
      source: "app-generated",
      textZone: "right",
      visualZone: "left-field",
      density: "dense",
      hierarchy: "senior-leader brief with compact title, dense proof signals, and footer CTA",
      artDirection: "restrained sidecar concept with credible professional texture and no decorative dead space",
      placeholderStrategy: "make the visual feel like a designed side field, not a blank rail or fake dashboard",
      appComposition: "left visual sidecar with right editorial copy stack and proof signal rail",
      promptDirectives: [
        "structured executive concept with visual sidecar",
        "no fake charts, dashboards, forms, or document widgets",
        "leave enough contrast for a restrained app-composed copy column",
      ],
    };
  }

  if (template.id === "magazine-one-pager") {
    return {
      id: longHeadline || visualSpecific ? "editorial-split" : "proof-band",
      source: "app-generated",
      textZone: "left",
      visualZone: "right-field",
      density: "editorial",
      hierarchy: "magazine one-pager hierarchy with dominant title, one deck, useful proof band, and clear CTA",
      artDirection: "premium editorial concept where imagery, crop, and quiet areas guide the reader through the page",
      placeholderStrategy: "suggest layout rhythm through image composition and tonal contrast; no blank panels, boxes, or fake type",
      appComposition: "headline/deck and official logo in the primary text zone, integrated proof band and CTA below",
      promptDirectives: [
        "full designed one-page concept, not a background texture",
        "visual crop should create a natural text zone and proof-band rhythm",
        "avoid unused empty canvas and generic brochure scaffolding",
      ],
    };
  }

  return {
    id: "editorial-split",
    source: "app-generated",
    textZone: "left",
    visualZone: "right-field",
    density: "balanced",
    hierarchy: "campaign flyer hierarchy with dominant headline, one deck, exactly two subpoints, and one CTA",
    artDirection: "full campaign concept with an intentional editorial split between message and brand-specific visual story",
    placeholderStrategy: "use light, shadow, crop, and subject placement to imply where type belongs; never draw placeholder boxes",
    appComposition: "left-led typeset message area with full-bleed art shaping the right side and lower CTA rhythm",
    promptDirectives: [
      "full flyer concept with visual hierarchy, not just a background",
      "right-side visual story should integrate with the left message zone",
      "no fake text, fake contact strip, fake logo, or blank document panels",
    ],
  };
}
