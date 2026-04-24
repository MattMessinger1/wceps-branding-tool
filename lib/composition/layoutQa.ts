import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { CompositionTemplate, FittedCopy, LayoutQa } from "@/lib/schema/generatedArtifact";
import { resolveCompositionTemplate } from "./templates";

type LayoutSpec = {
  headlineCharsPerLine: number;
  headlineMaxLines: number;
  deckCharsPerLine: number;
  deckMaxLines: number;
  proofCharsPerLine: number;
  proofMaxLines: number;
  ctaCharsPerLine: number;
  ctaMaxLines: number;
  expectedTemplate: CompositionTemplate["id"];
};

const specs: Record<CompositionTemplate["id"], LayoutSpec> = {
  "campaign-flyer": {
    headlineCharsPerLine: 16,
    headlineMaxLines: 5,
    deckCharsPerLine: 36,
    deckMaxLines: 3,
    proofCharsPerLine: 34,
    proofMaxLines: 4,
    ctaCharsPerLine: 24,
    ctaMaxLines: 1,
    expectedTemplate: "campaign-flyer",
  },
  "magazine-one-pager": {
    headlineCharsPerLine: 21,
    headlineMaxLines: 4,
    deckCharsPerLine: 48,
    deckMaxLines: 3,
    proofCharsPerLine: 28,
    proofMaxLines: 4,
    ctaCharsPerLine: 28,
    ctaMaxLines: 1,
    expectedTemplate: "magazine-one-pager",
  },
  "executive-brief": {
    headlineCharsPerLine: 28,
    headlineMaxLines: 3,
    deckCharsPerLine: 54,
    deckMaxLines: 3,
    proofCharsPerLine: 46,
    proofMaxLines: 2,
    ctaCharsPerLine: 28,
    ctaMaxLines: 1,
    expectedTemplate: "executive-brief",
  },
  "social-announcement": {
    headlineCharsPerLine: 18,
    headlineMaxLines: 4,
    deckCharsPerLine: 34,
    deckMaxLines: 3,
    proofCharsPerLine: 34,
    proofMaxLines: 1,
    ctaCharsPerLine: 24,
    ctaMaxLines: 1,
    expectedTemplate: "social-announcement",
  },
  "email-hero": {
    headlineCharsPerLine: 30,
    headlineMaxLines: 3,
    deckCharsPerLine: 62,
    deckMaxLines: 3,
    proofCharsPerLine: 52,
    proofMaxLines: 2,
    ctaCharsPerLine: 28,
    ctaMaxLines: 1,
    expectedTemplate: "email-hero",
  },
};

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function estimateLines(value: string, charsPerLine: number) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return Math.max(1, Math.ceil(cleaned.length / charsPerLine));
}

function minCharsPerLine(value: string, lines: number) {
  if (!value.trim() || lines <= 0) return 999;
  return Math.floor(value.replace(/\s+/g, " ").trim().length / lines);
}

function layoutSpec(template: CompositionTemplate) {
  return specs[template.id];
}

export function evaluateLayoutQa({
  artifactType,
  template,
  fittedCopy,
  request,
  logoCount = 1,
}: {
  artifactType: string;
  template: CompositionTemplate;
  fittedCopy: FittedCopy;
  request: ArtifactRequest;
  logoCount?: number;
}): LayoutQa {
  const expectedTemplate = resolveCompositionTemplate(artifactType);
  const spec = layoutSpec(template);
  const issues: string[] = [];
  const warnings: string[] = [];
  const headlineLines = estimateLines(fittedCopy.headline, spec.headlineCharsPerLine);
  const deckLines = estimateLines(fittedCopy.deck, spec.deckCharsPerLine);
  const scoredProofPoints = template.id === "social-announcement" ? [] : fittedCopy.proofPoints;
  const proofLines = scoredProofPoints.map((point) => estimateLines(point, spec.proofCharsPerLine));
  const maxProofLines = Math.max(...proofLines, 0);
  const minProofChars = Math.min(
    ...scoredProofPoints.map((point, index) => minCharsPerLine(point, proofLines[index] ?? 1)),
  );
  const ctaLines = estimateLines(fittedCopy.cta, spec.ctaCharsPerLine);
  const estimatedCanvasOverflow =
    headlineLines > spec.headlineMaxLines ||
    deckLines > spec.deckMaxLines ||
    maxProofLines > spec.proofMaxLines ||
    ctaLines > spec.ctaMaxLines;
  const noTextOverflow = clamp(
    100 -
      Math.max(0, headlineLines - spec.headlineMaxLines) * 20 -
      Math.max(0, deckLines - spec.deckMaxLines) * 18 -
      Math.max(0, maxProofLines - spec.proofMaxLines) * 18,
  );
  const noCtaCollision = clamp(100 - Math.max(0, ctaLines - spec.ctaMaxLines) * 35 - (fittedCopy.cta.length > 34 ? 20 : 0));
  const proofLineWidth = clamp(minProofChars < 18 ? 45 + minProofChars * 2 : minProofChars < 24 ? 78 : 96);
  const logoOnce = logoCount === 1 ? 100 : logoCount === 0 ? 70 : 35;
  const artifactFormatMatch = template.id === expectedTemplate.id ? 100 : 45;
  const exportReady = clamp((noTextOverflow + noCtaCollision + proofLineWidth + logoOnce + artifactFormatMatch) / 5);

  if (headlineLines > spec.headlineMaxLines) issues.push("Headline is estimated to overflow the selected template.");
  if (deckLines > spec.deckMaxLines) issues.push("Deck copy is too tall for the selected template.");
  if (maxProofLines > spec.proofMaxLines) issues.push("Proof copy is too tall for the selected template.");
  if (ctaLines > spec.ctaMaxLines || fittedCopy.cta.length > 34) issues.push("CTA is too long for a button and should move detail text to a footer/contact line.");
  if (minProofChars < 18) issues.push("Proof text is likely to wrap into a narrow word ladder.");
  if (logoCount !== 1) issues.push(`Expected exactly one logo, found ${logoCount}.`);
  if (template.id !== expectedTemplate.id) issues.push(`Expected ${expectedTemplate.id}, got ${template.id}.`);

  if (words(fittedCopy.headline).length > 10) warnings.push("Headline is long; consider a shorter editorial headline.");
  if (fittedCopy.proofPoints.length > 2 && template.id === "campaign-flyer") warnings.push("Flyers should use exactly two proof points.");
  if (!request.strictlySourceGrounded) warnings.push("Layout QA ran on a non-strict source-grounded request.");

  const sendability = clamp((noTextOverflow + noCtaCollision + proofLineWidth + logoOnce + artifactFormatMatch + exportReady) / 6);

  return {
    question: "Would I send this layout to the WCEPS team without apology?",
    overall: sendability,
    noTextOverflow,
    noCtaCollision,
    proofLineWidth,
    logoOnce,
    artifactFormatMatch,
    exportReady,
    sendability,
    status: issues.length ? "block" : sendability < 88 || warnings.length ? "warn" : "pass",
    issues,
    warnings,
    metrics: {
      headlineLines,
      deckLines,
      maxProofLines,
      minProofCharsPerLine: Number.isFinite(minProofChars) ? minProofChars : 999,
      ctaLines,
      estimatedCanvasOverflow,
    },
  };
}
