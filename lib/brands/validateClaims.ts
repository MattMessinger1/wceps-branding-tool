import type { BrandPack } from "@/lib/schema/brandPack";
import type { GeneratedCopy } from "@/lib/schema/generatedArtifact";
import type { ReviewState } from "@/lib/schema/reviewState";

const unsupportedPatterns = [
  { pattern: /\bguarantee(?:d|s)?\b/i, issue: "Guarantees are not supported by source evidence." },
  { pattern: /\bcertif(?:y|ied|ication)\b/i, issue: "Certification claims require explicit source evidence." },
  { pattern: /\bendorse(?:d|ment)?\b/i, issue: "Endorsement language is not supported unless separately approved." },
  { pattern: /\bproven to increase\b/i, issue: "Outcome-increase claims need specific evidence." },
  { pattern: /\b\d+%\b/i, issue: "Percentage claims must be source-cited and human-reviewed." },
  { pattern: /\bpricing\b|\bcosts?\b|\bfree\b/i, issue: "Pricing claims are outside the current source evidence." },
  { pattern: /\bofficial partner\b/i, issue: "Official partner claims need explicit approval." },
  { pattern: /\bwida[-\s]?endors(?:ed|es|ement)\b/i, issue: "WIDA PRIME materials must not be described as WIDA-endorsed." },
  { pattern: /\bprime\b.*\b(effectiveness|effective curriculum|student outcomes)\b/i, issue: "WIDA PRIME should not be described as judging effectiveness or outcomes." },
];

const brandDriftTerms: Record<string, string[]> = {
  "CARE Coaching": ["depth of knowledge", "dok", "leadership assessment"],
  WebbAlign: ["ccna", "three cs", "leadership assessment"],
  CALL: ["depth of knowledge", "dok", "three cs"],
  CCNA: ["depth of knowledge", "dok", "prime seal"],
  "WIDA PRIME": ["ccna", "care coaching needs assessment", "three cs", "leadership assessment"],
  WCEPS: [],
};

export function validateClaims(pack: BrandPack, copy: GeneratedCopy): ReviewState {
  const content = [
    ...copy.headlineOptions,
    ...copy.subheadOptions,
    copy.body,
    ...copy.bullets,
    copy.cta,
    copy.footer ?? "",
  ].join("\n");
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestedFixes: string[] = [];

  for (const avoidPhrase of pack.avoidPhrases) {
    if (content.toLowerCase().includes(avoidPhrase.toLowerCase())) {
      issues.push(`Avoid phrase appears: "${avoidPhrase}".`);
      suggestedFixes.push(`Replace "${avoidPhrase}" with source-grounded phrasing from ${pack.brandName}.`);
    }
  }

  for (const { pattern, issue } of unsupportedPatterns) {
    if (pattern.test(content)) {
      issues.push(issue);
      suggestedFixes.push("Revise the claim to describe support, tools, or services without promising outcomes.");
    }
  }

  for (const driftTerm of brandDriftTerms[pack.brandName] ?? []) {
    if (content.toLowerCase().includes(driftTerm)) {
      warnings.push(`Possible mixed-brand drift: "${driftTerm}" appears in ${pack.brandName} copy.`);
    }
  }

  for (const restrictedClaim of pack.restrictedClaims) {
    const leadingPhrase = restrictedClaim.replace(/^Do not\s+/i, "").split(/[.;:]/)[0]?.trim();
    if (leadingPhrase && leadingPhrase.length > 18 && content.toLowerCase().includes(leadingPhrase.toLowerCase())) {
      warnings.push(`Restricted claim needs review: ${restrictedClaim}`);
    }
  }

  if (copy.cta.trim().length < 6) {
    warnings.push("CTA is weak or missing.");
    suggestedFixes.push("Use one of the brand pack CTA suggestions.");
  }

  return {
    approved: false,
    status: issues.length ? "block" : warnings.length ? "warn" : "pass",
    issues,
    warnings,
    suggestedFixes: Array.from(new Set(suggestedFixes)),
  };
}
