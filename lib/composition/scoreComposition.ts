import { scoreBrandBoundary } from "@/lib/brands/brandBoundary";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { CompositionScore, CompositionTemplate, FittedCopy } from "@/lib/schema/generatedArtifact";
import { getBrandVisualProfile } from "@/lib/brands/brandVisualProfiles";
import { resolveCompositionTemplate } from "./templates";

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function termInPrompt(promptText: string, term: string) {
  return promptText.includes(term.toLowerCase());
}

function coverageScore(promptText: string, terms: string[], baseScore = 64) {
  if (!terms.length) return 88;
  const found = terms.filter((term) => termInPrompt(promptText, term)).length;
  return clamp(baseScore + (found / terms.length) * (100 - baseScore));
}

export function scoreComposition({
  artifactType,
  fittedCopy,
  template,
  prompt,
  request,
}: {
  artifactType: string;
  fittedCopy: FittedCopy;
  template: CompositionTemplate;
  prompt: string;
  request: ArtifactRequest;
}): CompositionScore {
  const issues: string[] = [];
  const warnings: string[] = [];
  const expectedTemplate = resolveCompositionTemplate(artifactType);
  const headlineWords = wordCount(fittedCopy.headline);
  const ctaWords = wordCount(fittedCopy.cta);
  const proofCount = fittedCopy.proofPoints.length;
  const promptText = prompt.toLowerCase();
  const visualProfile = getBrandVisualProfile(request.brand);
  const missingRequiredTerms = visualProfile.relevanceRequiredTerms.filter((term) => !termInPrompt(promptText, term));
  const missingAvoidTerms = visualProfile.relevanceForbiddenTerms.filter((term) => !termInPrompt(promptText, term));

  const whitespaceDensity = clamp(template.densityTarget === "minimal" ? 92 : proofCount >= 2 ? 92 : 68);
  const forbidsScaffolding =
    promptText.includes("no=") &&
    ["blank boxes", "mock ui", "cards", "brochure scaffolding", "document layouts"].every((term) => promptText.includes(term));
  const invitesScaffolding = ["blank copy zones", "reserve attractive blank zones", "copy slots", "brochure concept"].some((term) =>
    promptText.includes(term),
  );
  const templateScaffolding = invitesScaffolding ? 38 : forbidsScaffolding ? 96 : 72;
  const typographyQuality = clamp(96 - Math.abs(headlineWords - 9) * 3 - (ctaWords > 5 ? 12 : 0));
  const artifactMatch = template.id === expectedTemplate.id ? 96 : 55;
  const brandFidelity = promptText.includes("fake logos") && promptText.includes("app renders") ? 94 : 78;
  const requiredVisualTerms = visualProfile.relevanceRequiredTerms;
  const avoidedVisualTerms = visualProfile.relevanceForbiddenTerms;
  const requiredCoverage = coverageScore(promptText, requiredVisualTerms, 50);
  const avoidCoverage = coverageScore(promptText, avoidedVisualTerms, 72);
  const brandRelevance = clamp((requiredCoverage * 0.68 + avoidCoverage * 0.32));
  const boundaryResult = scoreBrandBoundary(
    request.brand,
    [fittedCopy.headline, fittedCopy.deck, ...fittedCopy.proofPoints, fittedCopy.cta],
    request,
  );
  const brandBoundary = clamp(boundaryResult.score);
  const expectedProofShape = template.id === "social-announcement" ? proofCount === 0 : proofCount >= 2;
  const textIntegration = clamp(fittedCopy.deck.endsWith(".") && expectedProofShape && fittedCopy.cta.length <= 42 ? 94 : 72);
  const fakeContentRisk =
    promptText.includes("fake text") && promptText.includes("fake logos") && promptText.includes("malformed ui") ? 95 : 72;

  if (headlineWords < 6 || headlineWords > 12) warnings.push("Headline should fit 6-12 words.");
  if (ctaWords > 5 || fittedCopy.cta.length > 42) warnings.push("CTA should be a short action phrase.");
  if (template.id === "social-announcement" && proofCount > 0) warnings.push("Social graphics should not include proof stacks.");
  if (template.id !== "social-announcement" && (proofCount < 2 || proofCount > 3)) warnings.push("Proof points should fit 2-3 short blocks.");
  if (template.id !== expectedTemplate.id) issues.push(`Artifact type "${artifactType}" is mapped to ${template.id}, expected ${expectedTemplate.id}.`);
  if (templateScaffolding < 80) issues.push("Image prompt still invites document scaffolding or fake layout elements.");
  if (brandRelevance < 72) issues.push(`${visualProfile.brandName} visual relevance cues are too generic or incomplete.`);
  else if (brandRelevance < 88) warnings.push(`${visualProfile.brandName} visual relevance could be more specific.`);
  if (missingRequiredTerms.length) {
    warnings.push(`${visualProfile.brandName} prompt is missing visual subject cue(s): ${missingRequiredTerms.slice(0, 3).join(", ")}.`);
  }
  if (missingAvoidTerms.length) {
    warnings.push(`${visualProfile.brandName} prompt is missing avoid guardrail(s): ${missingAvoidTerms.slice(0, 3).join(", ")}.`);
  }
  if (boundaryResult.leakedTerms.length) {
    issues.push(`${boundaryResult.brandName} copy includes sibling-brand term(s): ${boundaryResult.leakedTerms.slice(0, 4).join(", ")}.`);
  }
  if (boundaryResult.allowedMixedTerms.length) {
    warnings.push(`${boundaryResult.brandName} copy mixes brand terms by request: ${boundaryResult.allowedMixedTerms.slice(0, 4).join(", ")}.`);
  }
  if (!request.strictlySourceGrounded) warnings.push("Artifact is not in strict source-grounded mode.");

  const sendability = clamp(
    (whitespaceDensity + templateScaffolding + typographyQuality + artifactMatch + brandFidelity + brandRelevance + brandBoundary + textIntegration + fakeContentRisk) / 9,
  );

  return {
    question: "Would I send this to the WCEPS team without apology?",
    overall: sendability,
    whitespaceDensity,
    templateScaffolding,
    typographyQuality,
    artifactMatch,
    brandFidelity,
    brandRelevance,
    brandBoundary,
    textIntegration,
    fakeContentRisk,
    sendability,
    status: issues.length ? "block" : sendability < 85 || warnings.length ? "warn" : "pass",
    issues,
    warnings,
  };
}
