import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { SourceEvidence } from "@/lib/schema/brandPack";

export type BrandBoundaryRule = {
  brandName: string;
  preferredTerms: string[];
  blockedTerms: string[];
  parentContextTerms: string[];
};

export type BrandBoundaryResult = {
  brandName: string;
  score: number;
  leakedTerms: string[];
  allowedMixedTerms: string[];
};

const rules: Record<string, BrandBoundaryRule> = {
  "CARE Coaching": {
    brandName: "CARE Coaching",
    preferredTerms: ["coaching", "consulting", "continuous learning", "professional learning", "reflect", "customized support"],
    blockedTerms: [
      "CCNA",
      "CARE Coaching Needs Assessment",
      "Needs Assessment",
      "action-based data",
      "actionable reporting",
      "instructional practice focus",
      "school improvement planning",
    ],
    parentContextTerms: ["WCEPS", "Pathways"],
  },
  CCNA: {
    brandName: "CCNA",
    preferredTerms: [
      "needs assessment",
      "action-based data",
      "instructional practice",
      "actionable reporting",
      "multilingual learner support",
      "school improvement planning",
    ],
    blockedTerms: [
      "Three Cs",
      "Consulting, Coaching, and Continuous Learning",
      "personalized coaching sessions",
      "educator-friendly scheduling",
      "tailored professional development",
    ],
    parentContextTerms: ["CARE Coaching", "WCEPS"],
  },
  WebbAlign: {
    brandName: "WebbAlign",
    preferredTerms: ["DOK", "Depth of Knowledge", "standards", "learning objectives", "assessments", "curricula", "alignment", "coherence"],
    blockedTerms: [
      "CARE Coaching",
      "CCNA",
      "CALL",
      "WIDA PRIME",
      "leadership for learning",
      "school improvement planning",
      "PRIME process",
      "action-based data",
      "personalized coaching",
    ],
    parentContextTerms: ["WCEPS"],
  },
  CALL: {
    brandName: "CALL",
    preferredTerms: ["leadership for learning", "leadership development", "feedback", "professional growth", "school improvement planning"],
    blockedTerms: [
      "WebbAlign",
      "DOK",
      "Depth of Knowledge",
      "CARE Coaching",
      "CCNA",
      "WIDA PRIME",
      "PRIME process",
      "action-based data",
      "instructional materials correlations",
    ],
    parentContextTerms: ["WCEPS"],
  },
  "WIDA PRIME": {
    brandName: "WIDA PRIME",
    preferredTerms: [
      "instructional materials",
      "PRIME process",
      "PRIME 2020",
      "PRIME V1",
      "PRIME V2",
      "Spanish Language Development",
      "publishers",
      "correlators",
    ],
    blockedTerms: [
      "WIDA Workshops",
      "workshops and webinars",
      "sole source provider",
      "CARE Coaching",
      "CCNA",
      "CALL",
      "WebbAlign",
      "DOK",
      "leadership for learning",
      "action-based data",
      "endorses",
      "effectiveness",
      "guaranteed impact",
    ],
    parentContextTerms: ["WIDA", "WCEPS"],
  },
  WCEPS: {
    brandName: "WCEPS",
    preferredTerms: ["nonprofit", "research-informed", "customized educational support", "schools", "districts", "educators"],
    blockedTerms: [
      "CARE Coaching",
      "CCNA",
      "WebbAlign",
      "CALL",
      "WIDA PRIME",
      "DOK",
      "Depth of Knowledge",
      "PRIME process",
      "Three Cs",
      "action-based data",
      "leadership for learning",
    ],
    parentContextTerms: [],
  },
};

const aliases: Record<string, string> = {
  "WCEPS master": "WCEPS",
  "WCEPS Pathways": "WCEPS",
  CARE: "CARE Coaching",
  "CARE Coaching Needs Assessment": "CCNA",
  "WIDA Prime": "WIDA PRIME",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalBrand(brandName: string) {
  return aliases[brandName] ?? brandName;
}

function requestText(request?: ArtifactRequest) {
  if (!request) return "";
  return normalize(
    [
      request.brand,
      request.audience,
      request.goal,
      request.topic,
      request.keyMessage,
      request.cta,
      request.notes,
      request.visualInstruction,
    ].join(" "),
  );
}

function containsTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term));
}

function explicitRequestAllows(term: string, request?: ArtifactRequest) {
  const text = requestText(request);
  if (!text) return false;
  return text.includes(normalize(term));
}

export function getBrandBoundaryRule(brandName: string): BrandBoundaryRule {
  return rules[canonicalBrand(brandName)] ?? rules.WCEPS;
}

export function getAllBrandBoundaryRules() {
  return Object.values(rules);
}

export function findBrandBoundaryTerms(brandName: string, text: string, request?: ArtifactRequest): BrandBoundaryResult {
  const rule = getBrandBoundaryRule(brandName);
  const leakedTerms: string[] = [];
  const allowedMixedTerms: string[] = [];

  for (const term of rule.blockedTerms) {
    if (!containsTerm(text, term)) continue;
    if (explicitRequestAllows(term, request)) allowedMixedTerms.push(term);
    else leakedTerms.push(term);
  }

  const uniqueLeaks = Array.from(new Set(leakedTerms));
  const uniqueAllowed = Array.from(new Set(allowedMixedTerms));

  return {
    brandName: rule.brandName,
    score: Math.max(0, 100 - uniqueLeaks.length * 28 - uniqueAllowed.length * 8),
    leakedTerms: uniqueLeaks,
    allowedMixedTerms: uniqueAllowed,
  };
}

export function passesBrandBoundary(brandName: string, text: string, request?: ArtifactRequest) {
  return findBrandBoundaryTerms(brandName, text, request).leakedTerms.length === 0;
}

export function filterBrandBoundaryItems(brandName: string, items: string[], request?: ArtifactRequest) {
  return items.filter((item) => passesBrandBoundary(brandName, item, request));
}

export function filterBrandBoundaryEvidence<T extends SourceEvidence>(brandName: string, evidence: T[], request?: ArtifactRequest) {
  return evidence.filter((source) => passesBrandBoundary(brandName, `${source.label} ${source.excerpt}`, request));
}

export function scoreBrandBoundary(brandName: string, textParts: string[], request?: ArtifactRequest) {
  return findBrandBoundaryTerms(brandName, textParts.join(" "), request);
}

export function boundaryPromptSummary(brandName: string, request?: ArtifactRequest) {
  const rule = getBrandBoundaryRule(brandName);
  const blocked = rule.blockedTerms.filter((term) => !explicitRequestAllows(term, request));
  return {
    keep: rule.preferredTerms,
    avoid: blocked,
    parentContext: rule.parentContextTerms,
  };
}
