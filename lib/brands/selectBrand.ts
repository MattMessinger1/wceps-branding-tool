import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";
import { normalizeBrandSlug } from "./loadBrandPack";

export type BrandResolution = {
  selectedBrand: BrandPack;
  explicit: boolean;
  confidence: number;
  explanation: string;
  candidates: Array<{ brandName: string; score: number; reasons: string[] }>;
};

const inferenceTerms: Record<string, string[]> = {
  "CARE Coaching": [
    "care",
    "coaching",
    "professional learning",
    "multilingual",
    "english learner",
    "el leader",
    "ccna",
    "needs assessment",
    "workshops",
    "program evaluation",
    "family engagement",
  ],
  CCNA: [
    "ccna",
    "care coaching needs assessment",
    "needs assessment",
    "action-based data",
    "action-oriented data",
    "actionable reporting",
    "instructional practice focus",
    "school improvement planning",
    "professional development planning",
    "sample report",
  ],
  WebbAlign: [
    "webbalign",
    "webb",
    "dok",
    "depth of knowledge",
    "alignment",
    "coherence",
    "standards",
    "curriculum",
    "assessment",
    "instructional materials",
    "cognitive complexity",
  ],
  CALL: [
    "call",
    "leadership",
    "principal",
    "school improvement",
    "professional growth",
    "leadership development",
    "feedback system",
    "leadership for learning",
  ],
  "WIDA PRIME": [
    "wida prime",
    "prime 2020",
    "prime v1",
    "prime v2",
    "prime v2 español",
    "instructional materials",
    "prime seal",
    "publisher",
    "correlator",
    "spanish language development",
    "eld standards framework",
  ],
  WCEPS: ["wceps", "pathways", "compare", "institutional", "programs", "services"],
};

function scoreBrand(pack: BrandPack, request: ArtifactRequest) {
  const haystack = [
    request.artifactType,
    request.audience,
    request.goal,
    request.topic,
    request.cta,
    request.notes,
  ]
    .join(" ")
    .toLowerCase();
  const terms = inferenceTerms[pack.brandName] ?? [];
  const reasons: string[] = [];
  let score = 0;

  for (const term of terms) {
    if (haystack.includes(term.toLowerCase())) {
      score += term.length > 8 ? 3 : 2;
      reasons.push(term);
    }
  }

  for (const audience of pack.audiences) {
    if (request.audience.toLowerCase().includes(audience.name.toLowerCase())) {
      score += 5;
      reasons.push(`audience: ${audience.name}`);
    }
  }

  return { brandName: pack.brandName, score, reasons: Array.from(new Set(reasons)).slice(0, 5) };
}

export function selectBrand(request: ArtifactRequest, packs: BrandPack[]): BrandResolution {
  const explicitBrand = request.brand?.trim();
  if (explicitBrand) {
    const explicitSlug = normalizeBrandSlug(explicitBrand);
    const selectedBrand =
      packs.find((pack) => normalizeBrandSlug(pack.brandName) === explicitSlug) ??
      packs.find((pack) => normalizeBrandSlug(pack.brandName).includes(explicitSlug));

    if (selectedBrand) {
      return {
        selectedBrand,
        explicit: true,
        confidence: 1,
        explanation: `${selectedBrand.brandName} was explicitly selected.`,
        candidates: [{ brandName: selectedBrand.brandName, score: 100, reasons: ["explicit selection"] }],
      };
    }
  }

  const candidates = packs.map((pack) => scoreBrand(pack, request)).sort((a, b) => b.score - a.score);
  const selected = packs.find((pack) => pack.brandName === candidates[0]?.brandName) ?? packs[0];
  const top = candidates[0]?.score ?? 0;
  const second = candidates[1]?.score ?? 0;
  const confidence = top === 0 ? 0.25 : Math.min(0.95, 0.5 + (top - second) / Math.max(top, 1));

  return {
    selectedBrand: selected,
    explicit: false,
    confidence,
    explanation:
      top === 0
        ? "No strong brand-specific language was detected, so WCEPS was used as the safest parent brand."
        : `${selected.brandName} was inferred from request language: ${(candidates[0]?.reasons ?? []).join(", ")}.`,
    candidates,
  };
}
