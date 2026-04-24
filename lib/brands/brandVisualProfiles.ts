import type { ArtifactType } from "@/lib/schema/artifactRequest";

export type BrandVisualProfile = {
  brandName: string;
  preferredSubjects: string[];
  contextProps: string[];
  avoidSubjects: string[];
  appOwnedBrandElements: string[];
  visualTone: string[];
  artifactFitNotes: {
    flyer: string;
    onePager: string;
    social: string;
    email: string;
    executive: string;
  };
  relevanceRequiredTerms: string[];
  relevanceForbiddenTerms: string[];
};

const wcepsProfile: BrandVisualProfile = {
  brandName: "WCEPS",
  preferredSubjects: [
    "educators and district teams planning support",
    "research-informed professional learning",
    "inclusive school and district collaboration",
    "educational service design conversation",
  ],
  contextProps: [
    "planning notes",
    "educator resource packets",
    "district strategy materials",
    "inclusive classroom support materials",
  ],
  avoidSubjects: [
    "over-specific sub-brand scenes unless selected",
    "generic graduation imagery",
    "random classroom stock photography",
    "fake university marks",
  ],
  appOwnedBrandElements: ["WCEPS logo", "headline", "CTA", "proof copy", "source evidence"],
  visualTone: ["warm institutional", "clean nonprofit education", "credible", "human", "finished"],
  artifactFitNotes: {
    flyer: "campaign-forward parent-brand service visual with broad educator support cues",
    onePager: "editorial institutional overview with useful density and no empty panels",
    social: "simple WCEPS-safe announcement energy with minimal copy space",
    email: "calm email hero art that frames a concise institutional message",
    executive: "senior-leader-ready education support visual with restrained energy",
  },
  relevanceRequiredTerms: ["educator", "district", "planning", "support"],
  relevanceForbiddenTerms: ["graduation", "diploma", "fake university logo", "mascot"],
};

const profiles: Record<string, BrandVisualProfile> = {
  WCEPS: wcepsProfile,
  "CARE Coaching": {
    brandName: "CARE Coaching",
    preferredSubjects: [
      "coaching conversation between educators",
      "educator reflection and planning",
      "professional learning facilitation",
      "multilingual learner support planning",
    ],
    contextProps: [
      "coaching notes",
      "professional learning handouts",
      "language-support planning materials",
      "school team action notes",
    ],
    avoidSubjects: [
      "generic stock training room",
      "posed workshop photo",
      "fake logo shapes",
      "mountain or chevron wallpaper",
      "random book stacks",
    ],
    appOwnedBrandElements: ["CARE Coaching logo", "Three Cs wording", "headline", "CTA", "proof copy"],
    visualTone: ["collaborative", "practical", "bright", "educator-centered", "warm but polished"],
    artifactFitNotes: {
      flyer: "campaign-forward coaching visual with active educator collaboration",
      onePager: "editorial coaching story with compact proof and strong professional-learning context",
      social: "close-cropped coaching moment or abstract professional-learning energy",
      email: "wide warm professional-learning art strip without fake documents",
      executive: "district-ready coaching and planning atmosphere, not a classroom stock scene",
    },
    relevanceRequiredTerms: ["coaching", "educator", "professional learning", "planning"],
    relevanceForbiddenTerms: ["stock training", "lecture hall", "random books", "fake chevron"],
  },
  CCNA: {
    brandName: "CCNA",
    preferredSubjects: [
      "school team data debrief",
      "instructional practice review",
      "action-based planning conversation",
      "multilingual learner support planning",
    ],
    contextProps: [
      "anonymized report pages without readable text",
      "planning matrix shapes without labels",
      "sticky notes grouped by action priorities",
      "assessment reflection materials",
    ],
    avoidSubjects: [
      "generic coaching-only scene",
      "fake dashboard UI",
      "readable fake charts",
      "generic business analytics",
      "CARE Coaching drift without needs-assessment context",
    ],
    appOwnedBrandElements: ["CCNA or CARE logo", "needs assessment wording", "headline", "CTA", "proof copy"],
    visualTone: ["actionable", "data-informed", "clear", "school-improvement oriented", "professional"],
    artifactFitNotes: {
      flyer: "action-based needs-assessment visual with planning momentum",
      onePager: "instructional-practice and data-debrief editorial visual, not generic coaching",
      social: "focused action-planning visual with minimal non-readable data cues",
      email: "clean needs-assessment hero strip with report-review atmosphere",
      executive: "dense, credible action-data visual for instructional leaders",
    },
    relevanceRequiredTerms: ["data", "assessment", "planning", "instructional practice"],
    relevanceForbiddenTerms: ["generic dashboard", "fake chart", "stock graph", "business analytics"],
  },
  WebbAlign: {
    brandName: "WebbAlign",
    preferredSubjects: [
      "curriculum team reviewing standards",
      "assessment and learning objective alignment",
      "instructional materials analysis",
      "DOK calibration workshop table",
    ],
    contextProps: [
      "standards documents with unreadable text",
      "curriculum maps without labels",
      "assessment packets",
      "alignment notes and calibrated materials",
    ],
    avoidSubjects: [
      "generic school hallway",
      "random classroom scene",
      "fake DOK diagram with labels",
      "readable charts",
      "abstract arrows pretending to be alignment",
    ],
    appOwnedBrandElements: ["WebbAlign logo", "DOK language", "headline", "CTA", "proof copy"],
    visualTone: ["analytical", "clear", "calibrated", "curriculum-focused", "expert"],
    artifactFitNotes: {
      flyer: "curriculum-alignment campaign visual with standards and assessment materials",
      onePager: "editorial curriculum-analysis visual with strong intellectual structure",
      social: "bold alignment/DOK cue without fake diagrams or labels",
      email: "wide standards-to-assessment review atmosphere",
      executive: "restrained alignment-review visual for curriculum leaders",
    },
    relevanceRequiredTerms: ["standards", "assessment", "curriculum", "alignment"],
    relevanceForbiddenTerms: ["school hallway", "generic classroom", "fake diagram", "readable chart"],
  },
  CALL: {
    brandName: "CALL",
    preferredSubjects: [
      "principal and leadership team planning",
      "school improvement conversation",
      "feedback report review",
      "professional growth planning",
    ],
    contextProps: [
      "school improvement notes",
      "feedback reports without readable text",
      "leadership planning materials",
      "team reflection artifacts",
    ],
    avoidSubjects: [
      "generic PD workshop",
      "fake leadership dashboard",
      "corporate boardroom scene",
      "random classroom stock",
      "readable charts",
    ],
    appOwnedBrandElements: ["CALL logo", "leadership for learning wording", "headline", "CTA", "proof copy"],
    visualTone: ["leadership-focused", "reflective", "strategic", "credible", "calm"],
    artifactFitNotes: {
      flyer: "leadership-for-learning campaign visual with planning and school-improvement energy",
      onePager: "editorial leadership-development visual with useful density",
      social: "simple principal/leadership planning atmosphere with clear focal point",
      email: "wide leadership-planning hero art without dashboard UI",
      executive: "senior-leader friendly school-improvement planning visual",
    },
    relevanceRequiredTerms: ["leadership", "principal", "school improvement", "feedback"],
    relevanceForbiddenTerms: ["corporate boardroom", "fake dashboard", "generic PD", "stock workshop"],
  },
  "WIDA PRIME": {
    brandName: "WIDA PRIME",
    preferredSubjects: [
      "K-12 content-area instructional materials",
      "teacher editions and student workbooks",
      "curriculum binders and grade-band packets",
      "standards alignment review",
      "publisher and correlator workflow",
    ],
    contextProps: [
      "science, math, language arts, and social studies curriculum materials",
      "instructional material sample spreads without readable text",
      "alignment review notes without labels",
      "publisher review table",
      "grade-band curriculum packets",
    ],
    avoidSubjects: [
      "random novels",
      "trade books",
      "library stacks",
      "fake book titles",
      "fake publisher brands",
      "fake PRIME seals",
      "endorsement imagery",
    ],
    appOwnedBrandElements: ["WIDA PRIME logo", "verified seal or badge only if present", "headline", "CTA", "proof copy"],
    visualTone: ["publisher-facing", "standards-aligned", "clean", "material-specific", "trustworthy"],
    artifactFitNotes: {
      flyer: "campaign visual built around K-12 curriculum materials and alignment review context",
      onePager: "editorial instructional-materials spread with publisher/correlator specificity",
      social: "minimal curriculum-materials announcement with no fake book text",
      email: "wide instructional-materials hero strip with standards-alignment context",
      executive: "clean review-process visual with content-area materials, not generic books",
    },
    relevanceRequiredTerms: ["instructional materials", "K-12", "curriculum", "alignment"],
    relevanceForbiddenTerms: ["novel", "trade book", "library stack", "fake title", "fake publisher", "fake seal"],
  },
};

const aliases: Record<string, string> = {
  "WCEPS master": "WCEPS",
  "WCEPS Pathways": "WCEPS",
  CARE: "CARE Coaching",
  "CARE Coaching Needs Assessment": "CCNA",
  "CALL": "CALL",
  "WIDA Prime": "WIDA PRIME",
};

function profileKey(brandName: string) {
  return aliases[brandName] ?? brandName;
}

export function getBrandVisualProfile(brandName: string): BrandVisualProfile {
  return profiles[profileKey(brandName)] ?? wcepsProfile;
}

export function getAllBrandVisualProfiles() {
  return Object.values(profiles);
}

export function artifactFitNote(profile: BrandVisualProfile, artifactType: string) {
  if (artifactType === "social-graphic") return profile.artifactFitNotes.social;
  if (artifactType === "one-pager") return profile.artifactFitNotes.onePager;
  if (artifactType.startsWith("html-email") || artifactType === "email-header") return profile.artifactFitNotes.email;
  if (artifactType === "conference-handout" || artifactType === "landing-page" || artifactType === "website") {
    return profile.artifactFitNotes.executive;
  }
  return profile.artifactFitNotes.flyer;
}

export function brandVisualProfileCues(brandName: string) {
  const profile = getBrandVisualProfile(brandName);
  return [
    ...profile.preferredSubjects,
    ...profile.contextProps,
    ...profile.visualTone,
  ].join(" ");
}

