import { filterBrandBoundaryItems, passesBrandBoundary } from "@/lib/brands/brandBoundary";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { CompositionTemplate, FittedCopy, GeneratedCopy } from "@/lib/schema/generatedArtifact";
import { hasDanglingFragment, repairKnownTruncations } from "./qaHelpers";
import { templateProofCount } from "./templates";

function clean(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function words(value: string) {
  return clean(value)
    .split(/\s+/)
    .filter(Boolean);
}

function significantWords(value: string) {
  const stopWords = new Set([
    "about",
    "action",
    "alongside",
    "and",
    "are",
    "based",
    "brand",
    "care",
    "coaching",
    "district",
    "education",
    "educator",
    "educators",
    "for",
    "from",
    "guides",
    "leaders",
    "learning",
    "page",
    "provides",
    "school",
    "support",
    "supports",
    "that",
    "the",
    "their",
    "this",
    "through",
    "wceps",
    "with",
  ]);

  return new Set(
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word)),
  );
}

function similarity(left: string, right: string) {
  const leftWords = significantWords(left);
  const rightWords = significantWords(right);
  if (!leftWords.size || !rightWords.size) return clean(left).toLowerCase() === clean(right).toLowerCase() ? 1 : 0;

  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return shared / union;
}

function isTooSimilar(value: string, references: string[], threshold = 0.58) {
  return references.some((reference) => similarity(value, reference) >= threshold);
}

function capitalizeFirst(value: string) {
  const cleaned = clean(value);
  return cleaned ? `${cleaned[0].toUpperCase()}${cleaned.slice(1)}` : cleaned;
}

function isGenericProductionInstruction(value: string) {
  const normalized = clean(value).toLowerCase();
  return [
    "create a useful brand-safe artifact",
    "create a useful artifact",
    "useful brand-safe artifact",
    "brand-safe artifact",
    "professional artifact",
  ].some((phrase) => normalized.includes(phrase));
}

function isVagueMarketingCopy(value: string) {
  const normalized = clean(value).toLowerCase();
  return [
    "alignment conversations",
    "strengthen alignment conversations",
    "source-grounded support",
    "brand-specific guidance",
    "clear next steps",
    "useful artifact",
    "brand-safe artifact",
  ].some((phrase) => normalized.includes(phrase));
}

function strongHeadlinesForBrand(request: ArtifactRequest) {
  const byBrand: Record<string, string[]> = {
    "CARE Coaching": [
      "Support educators through Consulting, Coaching, and Continuous Learning",
      "Every Voice, Every Classroom, Every Learner",
    ],
    CCNA: [
      "Use CCNA data to guide improvement planning",
      "Action-Based Data for EL Leadership and School Improvement",
    ],
    WebbAlign: [
      "Review Alignment Across Standards, Objectives, and Assessments",
      "Use DOK to Review Curriculum and Assessment Alignment",
    ],
    CALL: [
      "Focus leadership growth on school improvement",
      "Turn leadership feedback into improvement planning",
    ],
    "WIDA PRIME": [
      "Clarify PRIME Review for Instructional Materials",
      "Support PRIME correlations for publisher teams",
    ],
    WCEPS: [
      "Connect teams with research-informed WCEPS support",
      "Customized educational support for schools and districts",
    ],
  };

  return byBrand[request.brand] ?? [];
}

function strongDeckForBrand(request: ArtifactRequest) {
  const byBrand: Record<string, string> = {
    "CARE Coaching": "Support educators through Consulting, Coaching, and Continuous Learning.",
    CCNA: "Use needs assessment findings and actionable reporting to guide instructional practice and improvement planning.",
    WebbAlign: "Use DOK to evaluate standards, objectives, assessments, curricula, and instructional materials.",
    CALL: "Use leadership feedback to guide professional growth and school improvement planning.",
    "WIDA PRIME": "Help publisher teams understand PRIME review, correlations, and instructional-materials alignment.",
    WCEPS: "Connect schools and districts with nonprofit, research-informed, customized educational support.",
  };

  return byBrand[request.brand];
}

function strongProofsForBrand(request: ArtifactRequest) {
  const byBrand: Record<string, string[]> = {
    "CARE Coaching": [
      "Support educator reflection with customized coaching.",
      "Use Consulting, Coaching, and Continuous Learning.",
      "Support multilingual learner planning and family engagement.",
    ],
    CCNA: [
      "Use a structured needs assessment to identify strengths and growth areas.",
      "Use actionable reporting to guide instructional practice.",
      "Connect findings to school improvement and professional development planning.",
    ],
    WebbAlign: [
      "Use DOK to review standards, objectives, assessments, curricula, and materials.",
      "Use DOK to examine cognitive complexity.",
      "Build coherence across learning opportunities and assessment tasks.",
    ],
    CALL: [
      "Use leadership feedback to guide professional growth.",
      "Connect leadership development to school improvement planning.",
      "Support administrators with tools and tailored services.",
    ],
    "WIDA PRIME": [
      "Clarify PRIME 2020 review for instructional materials.",
      "Show PRIME V1/V2 and Spanish Language correlations.",
      "Serve publisher and correlator workflows without implying endorsement.",
    ],
    WCEPS: [
      "Connect teams with nonprofit, research-informed resources.",
      "Support schools and districts through customized educational pathways.",
      "Connect UW-Madison educational innovations with practical services.",
    ],
  };

  return byBrand[request.brand] ?? [
    `Support ${request.audience || "education teams"} with practical guidance.`,
    "Create a focused planning path.",
  ];
}

function stripBrandLead(value: string, brandName: string) {
  let result = clean(value);
  const brand = escapeRegExp(brandName);
  const brandLead = new RegExp(`^(?:The\\s+)?${brand}\\s+(?:provides|offers|supports|can support|helps|focuses on|is|are)\\s+`, "i");
  const sourceLead = new RegExp(`^The\\s+${brand}\\s+page\\s+(?:identifies|lists|says|describes)\\s+`, "i");

  result = result.replace(sourceLead, "").replace(brandLead, "");
  return capitalizeFirst(repairKnownTruncations(result));
}

function polishSentenceFragment(value: string, brandName: string) {
  let result = clean(value);

  if (brandName === "CARE Coaching") {
    result = result
      .replace(/^Multilingual learner success\b/i, "Support multilingual learner success")
      .replace(/^Educators through\b/i, "Support educators through")
      .replace(/^Customized learning opportunities\b/i, "Provide customized learning opportunities")
      .replace(
        /^Provide customized learning opportunities for administrators, teachers, school leaders, and district leaders\b/i,
        "Support educators through Consulting, Coaching, and Continuous Learning",
      )
      .replace(/^Reflect on current practices\b/i, "Help educators reflect on current practices")
      .replace(/^The Three Cs as Consulting, Coaching, and Continuous Learning\b/i, "Use Consulting, Coaching, and Continuous Learning")
      .replace(/^Consulting, Coaching, and Continuous Learning\b/i, "Use Consulting, Coaching, and Continuous Learning");
  }

  if (brandName === "CCNA") {
    result = result
      .replace(
        /^District EL leaders identify strengths, uncover growth areas, and use action-based data for school improvement\b/i,
        "Use needs assessment findings and actionable reporting to guide instructional practice",
      )
      .replace(
        /^CCNA identifies strengths, uncovers growth areas, and gives education leaders action-based data to support school improvement and professional development planning\b/i,
        "Use action-based data to guide school improvement and professional development planning",
      )
      .replace(
        /^CCNA identifies strengths, uncovers growth areas, and guides education leaders with action-based data\b/i,
        "Use a structured needs assessment to identify strengths and growth areas",
      )
      .replace(
        /^CCNA identifies strengths, uncovers growth areas, and gives education leaders action-based data to support school improvement and professional\.?$/i,
        "Use action-based data to guide school improvement and professional development planning",
      )
      .replace(/^Instructional practice focus\b/i, "Focus on instructional practice")
      .replace(/^Actionable reporting\b/i, "Provide actionable reporting")
      .replace(/^Multilingual learner support\b/i, "Support multilingual learner planning")
      .replace(/^Shared, actionable starting points\b/i, "Create shared, actionable starting points")
      .replace(/^The work through assessment, data analysis, and action planning\b/i, "Guide action planning through assessment and data analysis")
      .replace(/^CCNA gives educators shared\b/i, "Give educators shared");
  }

  if (brandName === "WebbAlign") {
    result = result
      .replace(/^Use DOK to strengthen alignment conversations\b/i, "Use DOK to review curriculum and assessment alignment")
      .replace(/^Strengthen DOK alignment conversations\b/i, "Review DOK alignment across curriculum and assessments")
      .replace(/^Strengthen alignment conversations\b/i, "Review alignment across standards, objectives, and assessments")
      .replace(/^WebbAlign promotes effective and accurate use\b/i, "Promote effective and accurate use")
      .replace(/^Effective and accurate use\b/i, "Support effective and accurate use")
      .replace(/^An aligned, coherent system\b/i, "Build an aligned, coherent system")
      .replace(/^Learning opportunities and assessment tasks\b/i, "Align learning opportunities and assessment tasks")
      .replace(/^The program helps education teams\b/i, "Help education teams")
      .replace(/^Promotes effective and accurate use\b/i, "Promote effective and accurate use")
      .replace(/^Teams use the lens of DOK to evaluate.*$/i, "Use DOK to evaluate standards, objectives, assessments, curricula, and materials")
      .replace(/^WebbAlign professional learning can help teams build.*$/i, "Build a calibrated understanding of DOK")
      .replace(/^A WCEPS program that works\b/i, "Work");
  }

  if (brandName === "CALL") {
    result = result
      .replace(
        /^Provide tools, customized services, and feedback systems that support school and district leaders with leadership development, professional growth, and school improvement planning\b/i,
        "Support leadership development, feedback, professional growth, and school improvement planning",
      )
      .replace(/^Leadership development\b/i, "Support leadership development")
      .replace(/^Professional growth\b/i, "Guide professional growth")
      .replace(/^School improvement planning\b/i, "Inform school improvement planning")
      .replace(/^Unique tools and customized services\b/i, "Use tools and customized services")
      .replace(/^CALL includes a reporting system\b/i, "Use reporting tools")
      .replace(/^The Comprehensive Assessment of Leadership for Learning provides\b/i, "Provide")
      .replace(
        /^Provide tools, customized services, and feedback systems that support school and district\.?$/i,
        "Support leadership development, feedback, professional growth, and school improvement planning",
      )
      .replace(/^Use reporting tools used by school and district leaders as a tool\b/i, "Use reporting tools");
  }

  if (brandName === "WIDA PRIME") {
    result = result
      .replace(
        /^Clarify PRIME V2 Español materials correlated with materials correlated with\b/i,
        "Clarify PRIME V2 Español correlations with",
      )
      .replace(/^Instructional materials\b/i, "Clarify instructional materials")
      .replace(/^Information about\b/i, "Provide information about")
      .replace(/^Reviewed PRIME\b/i, "Show reviewed PRIME")
      .replace(/^Spanish Language Development correlations\b/i, "Clarify Spanish Language Development correlations")
      .replace(/^Users understand how\b/i, "Help users understand how")
      .replace(/^PRIME V2 Español includes\b/i, "Clarify PRIME V2 Español materials correlated with")
      .replace(
        /^PRIME 2020 includes materials aligned to the current WIDA English Language Development Standards Framework\b/i,
        "Show PRIME 2020 alignment to WIDA ELD Standards",
      )
      .replace(/^The WIDA PRIME site lists reviewed PRIME V1 and V2 correlations\b/i, "List reviewed PRIME V1 and V2 correlations")
      .replace(
        /^Clarify PRIME V2 Español materials correlated with materials correlated with\b/i,
        "Clarify PRIME V2 Español correlations with",
      )
      .replace(/^PRIME 2020 alignments\b/i, "Show PRIME 2020 alignments")
      .replace(/\bPRIME v1\b/g, "PRIME V1")
      .replace(/\bPRIME v2\b/g, "PRIME V2")
      .replace(/\band v2\b/g, "and V2");
  }

  if (brandName === "WCEPS") {
    result = result
      .replace(
        /^Help education teams chart a course through research-based resources, professional learning, assessments, program evaluations, and content alignment analyses\b/i,
        "Connect teams with research-based resources, professional learning, assessments, and alignment support",
      )
      .replace(
        /^Help education teams chart a course through research-based resources, professional learning, assessments, program\.?$/i,
        "Connect teams with research-based resources, professional learning, assessments, and alignment support",
      )
      .replace(/^Research-based resources\b/i, "Connect teams with research-based resources")
      .replace(/^Customized support\b/i, "Provide customized support")
      .replace(/^Professional learning\b/i, "Support professional learning")
      .replace(/^Pathways programs help educators\b/i, "Help educators")
      .replace(/^WCEPS tailors\b/i, "Tailor")
      .replace(/^Pathways Powered by WCEPS helps\b/i, "Help")
      .replace(/^Help educators identify a challenge, choose a pathway, and continue\b/i, "Help educators choose a practical support pathway")
      .replace(
        /^Schools and districts with educational resources, assessments, professional learning, program\b/i,
        "Support schools and districts with resources, assessments, and professional learning",
      );

    result = result.replace(
      /^Help education teams chart a course through research-based resources, professional learning, assessments, program\.?$/i,
      "Connect teams with research-based resources, professional learning, assessments, and alignment support",
    );
  }

  return capitalizeFirst(result);
}

function firstSentence(value: string) {
  const cleaned = clean(value);
  const protectedText = cleaned
    .replace(/\bDr\./g, "Dr<dot>")
    .replace(/\bMr\./g, "Mr<dot>")
    .replace(/\bMs\./g, "Ms<dot>")
    .replace(/\bMrs\./g, "Mrs<dot>");
  const match = protectedText.match(/^.*?[.!?](?:\s|$)/);
  return clean((match?.[0] ?? protectedText).replace(/<dot>/g, "."));
}

function trimWords(value: string, maxWords: number) {
  const weakEndings = new Set(["a", "an", "and", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
  const selected = words(value).slice(0, maxWords);
  while (selected.length > 1 && weakEndings.has(selected[selected.length - 1].toLowerCase().replace(/[^a-z]/g, ""))) {
    selected.pop();
  }
  return repairKnownTruncations(selected.join(" ").replace(/[,:;–-]+$/g, "").replace(/[.!?]+$/g, ""));
}

function templateCaps(template: CompositionTemplate) {
  if (template.id === "magazine-one-pager") return { deckWords: 16, proofWords: 10, headlineWords: 9 };
  if (template.id === "executive-brief") return { deckWords: 18, proofWords: 12, headlineWords: 10 };
  if (template.id === "social-announcement") return { deckWords: 12, proofWords: 8, headlineWords: 8 };
  if (template.id === "email-hero") return { deckWords: 18, proofWords: 10, headlineWords: 9 };
  return { deckWords: 16, proofWords: 12, headlineWords: 10 };
}

function fitHeadline(options: string[], request: ArtifactRequest) {
  const rawCandidates = [request.keyMessage, ...options].map(clean).filter(Boolean);
  const strongHeadlines = strongHeadlinesForBrand(request);
  const polishedCandidates = rawCandidates.filter((candidate) => !isGenericProductionInstruction(candidate) && !isVagueMarketingCopy(candidate));
  const candidates = polishedCandidates.length ? polishedCandidates : rawCandidates;
  const strongCandidate = strongHeadlines.find((candidate) => {
    const lower = candidate.toLowerCase();
    if (request.brand === "WebbAlign") return /DOK|standards|objectives|assessments|curriculum|alignment/i.test(candidate);
    if (request.brand === "CCNA") return /CCNA|needs assessment|action-based data|instructional practice|improvement/i.test(candidate);
    return lower.length > 0;
  });
  const needsStrongHeadline = candidates.some(isVagueMarketingCopy) || (request.brand === "WebbAlign" && /conversation/i.test(candidates[0] ?? ""));
  if (needsStrongHeadline && strongCandidate) return strongCandidate.replace(/[.!?]+$/g, "");
  const preferred = candidates.find((candidate) => {
    const count = words(candidate).length;
    return count >= 6 && count <= 12;
  });
  const selected = preferred ?? candidates[0] ?? "WCEPS support for education teams";
  const count = words(selected).length;

  if (count > 12) return trimWords(selected, 12);
  if (count < 6 && request.audience) return trimWords(`${selected.replace(/[.!?]+$/g, "")} for ${request.audience}`, 12);
  return selected.replace(/[.!?]+$/g, "");
}

function deckCharCap(template: CompositionTemplate) {
  if (template.id === "campaign-flyer") return 90;
  if (template.id === "social-announcement") return 92;
  if (template.id === "email-hero") return 118;
  if (template.id === "executive-brief") return 126;
  return 136;
}

function fitDeck(copy: GeneratedCopy, request: ArtifactRequest, template: CompositionTemplate, maxWords = 22) {
  const boundarySafeBullets = filterBrandBoundaryItems(request.brand, copy.bullets, request);
  const proofReferences = boundarySafeBullets.map((bullet) => fitProofPoint(bullet, request.brand));
  const candidates = [copy.subheadOptions[0], copy.subheadOptions[1], copy.subheadOptions[2], copy.body]
    .map((item) => firstSentence(item || ""))
    .filter(
      (item) =>
        item &&
        passesBrandBoundary(request.brand, item, request) &&
        !/\b(a|an|and|by|for|from|in|of|on|or|the|to|with)[.!?]?$/i.test(item),
    );
  const careThreeCs = request.brand === "CARE Coaching" && /consulting|coaching|continuous learning/i.test([...copy.bullets, copy.body].join(" "));
  const strongDeck = strongDeckForBrand(request);
  const shouldUseStrongDeck =
    (request.brand === "CALL" && /Comprehensive Assessment of Leadership for Learning|professional growth, leadership development/i.test(candidates.join(" "))) ||
    (request.brand === "CCNA" && !/CCNA|needs assessment|instructional practice|actionable reporting/i.test(candidates.join(" "))) ||
    (request.brand === "WebbAlign" &&
      (candidates.some(isVagueMarketingCopy) || !/DOK|Depth of Knowledge|standards|objectives|assessment|curricul|materials|coherence|alignment/i.test(candidates.join(" ")))) ||
    (request.brand === "WCEPS" && !/nonprofit|research-informed|customized educational support/i.test(candidates.join(" "))) ||
    (request.brand === "WIDA PRIME" && !/PRIME|instructional materials|publisher|correlation/i.test(candidates.join(" ")));
  const candidate = careThreeCs
    ? "Support educators through Consulting, Coaching, and Continuous Learning."
    : shouldUseStrongDeck && strongDeck
      ? strongDeck
    : candidates.find((item) => !isTooSimilar(item, proofReferences, 0.62)) ?? candidates[0] ?? firstSentence(copy.body);
  const shortened = trimWords(polishSentenceFragment(stripBrandLead(candidate, request.brand), request.brand), maxWords);
  const sentence = `${shortened.replace(/[.!?]+$/g, "")}.`;
  const polishedStrong = strongDeck ? `${trimWords(strongDeck, maxWords).replace(/[.!?]+$/g, "")}.` : "";

  if (
    polishedStrong &&
    (hasDanglingFragment(sentence) || isVagueMarketingCopy(sentence) || clean(sentence).length > deckCharCap(template))
  ) {
    return polishedStrong;
  }

  return sentence;
}

function fitProofPoint(value: string, brandName = "", maxWords = 18) {
  const boundary = brandName ? polishSentenceFragment(stripBrandLead(value, brandName), brandName) : value;
  const shortened = trimWords(boundary, maxWords);
  return repairKnownTruncations(`${shortened.replace(/[.!?]+$/g, "")}.`);
}

function fallbackProofsForBrand(request: ArtifactRequest) {
  return strongProofsForBrand(request);
}

function contactName(value: string) {
  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (!email) return "";
  const local = email.split("@")[0];
  const first = local.split(/[._-]+/).find(Boolean);
  return first ? `${first[0].toUpperCase()}${first.slice(1).toLowerCase()}` : "";
}

function fitCta(value: string): { cta: string; ctaDetail?: string } {
  const cleaned = clean(value).replace(/[.!?]+$/g, "");
  const email = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) {
    const name = contactName(cleaned);
    return { cta: name ? `Email ${name}` : "Email us", ctaDetail: email };
  }

  if (words(cleaned).length <= 5 && cleaned.length <= 42) return { cta: cleaned };

  const lowered = cleaned.toLowerCase();
  if (lowered.includes("conversation")) return { cta: "Request a conversation", ctaDetail: cleaned === "Request a conversation" ? undefined : cleaned };
  if (lowered.includes("demo")) return { cta: "Request a demo", ctaDetail: cleaned };
  if (lowered.includes("learn")) return { cta: "Learn more", ctaDetail: cleaned };
  if (lowered.includes("contact")) return { cta: "Contact us", ctaDetail: cleaned };
  if (lowered.includes("start")) return { cta: "Start the process", ctaDetail: cleaned };
  return { cta: trimWords(cleaned, 4), ctaDetail: cleaned };
}

export function fitCopy(copy: GeneratedCopy, request: ArtifactRequest, template: CompositionTemplate): FittedCopy {
  const proofLimit = templateProofCount(template);
  const caps = templateCaps(template);
  const headline = trimWords(fitHeadline(copy.headlineOptions, request), caps.headlineWords);
  const deck = fitDeck(copy, request, template, caps.deckWords);
  const proofCandidates = filterBrandBoundaryItems(request.brand, [...strongProofsForBrand(request), ...copy.bullets], request)
    .map((bullet) => fitProofPoint(bullet, request.brand, caps.proofWords))
    .filter((bullet) => passesBrandBoundary(request.brand, bullet, request))
    .filter((bullet) => !isVagueMarketingCopy(bullet))
    .filter((bullet) => !hasDanglingFragment(bullet))
    .filter(Boolean);
  const proofPoints: string[] = [];

  for (const candidate of proofCandidates) {
    if (proofPoints.length >= proofLimit) break;
    if (isTooSimilar(candidate, [headline, deck, ...proofPoints])) continue;
    proofPoints.push(candidate);
  }

  while (proofPoints.length < Math.min(2, proofLimit)) {
    const fallback = proofCandidates.find(
      (candidate) => !isTooSimilar(candidate, [headline, deck, ...proofPoints], 0.74) && !proofPoints.includes(candidate),
    );
    if (!fallback) break;
    proofPoints.push(fallback);
  }

  const fallbackProofs = fallbackProofsForBrand(request).map((item) => fitProofPoint(item, request.brand, caps.proofWords));

  for (const fallback of fallbackProofs) {
    if (proofPoints.length >= Math.min(2, proofLimit)) break;
    if (isTooSimilar(fallback, [headline, deck, ...proofPoints], 0.72)) continue;
    proofPoints.push(fallback);
  }

  for (const fallback of fallbackProofs) {
    if (proofPoints.length >= proofLimit) break;
    if (proofPoints.includes(fallback)) continue;
    proofPoints.push(fallback);
  }

  const cta = fitCta(copy.cta || request.cta);

  return {
    headline,
    deck,
    proofPoints: proofPoints.slice(0, proofLimit),
    cta: cta.cta,
    ctaDetail: cta.ctaDetail === cta.cta ? undefined : cta.ctaDetail,
    footer: undefined,
  };
}
