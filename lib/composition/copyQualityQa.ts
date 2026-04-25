import { findBrandBoundaryTerms, getBrandBoundaryRule } from "@/lib/brands/brandBoundary";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { FailureMode, FittedCopy, GeneratedCopy, StageQa } from "@/lib/schema/generatedArtifact";
import { cleanQaText, failureMode, hasDanglingFragment, normalizeQaText, repairKnownTruncations, similarIntent, stageQa } from "./qaHelpers";

function repeatedMeaning(values: string[]) {
  const repeated: Array<[string, string]> = [];

  for (let index = 0; index < values.length; index += 1) {
    for (let other = index + 1; other < values.length; other += 1) {
      if (similarIntent(values[index], values[other])) {
        repeated.push([values[index], values[other]]);
      }
    }
  }

  return repeated;
}

function ctaDetailDuplicates(cta: string, detail?: string) {
  if (!detail) return false;
  const ctaText = normalizeQaText(cta);
  const detailText = normalizeQaText(detail);
  if (!ctaText || !detailText) return false;
  if (detailText === ctaText || detailText.includes(ctaText)) return true;
  return similarIntent(cta, detail);
}

function careSemanticDrift(fittedCopy: FittedCopy, request: ArtifactRequest) {
  if (request.brand !== "CARE Coaching") return false;
  const deck = normalizeQaText(fittedCopy.deck);
  return deck.includes("professional learning") && !/(coaching|consulting|continuous learning)/i.test(fittedCopy.deck);
}

function missingPreferredTerms(fittedCopy: FittedCopy, request: ArtifactRequest) {
  const rule = getBrandBoundaryRule(request.brand);
  const text = normalizeQaText([fittedCopy.headline, fittedCopy.deck, ...fittedCopy.proofPoints].join(" "));
  return rule.preferredTerms.filter((term) => !text.includes(normalizeQaText(term))).slice(0, 3);
}

function hasAnyPreferredTerm(fittedCopy: FittedCopy, request: ArtifactRequest) {
  const rule = getBrandBoundaryRule(request.brand);
  const text = normalizeQaText([fittedCopy.headline, fittedCopy.deck, ...fittedCopy.proofPoints].join(" "));
  return rule.preferredTerms.some((term) => text.includes(normalizeQaText(term)));
}

function internalScaffoldFooter(value?: string) {
  if (!value) return false;
  return /(draft generated|internal review|source evidence|claims should remain tied|generated for internal)/i.test(value);
}

export function evaluateCopyQualityQa({
  copy,
  fittedCopy,
  request,
}: {
  copy: GeneratedCopy;
  fittedCopy: FittedCopy;
  request: ArtifactRequest;
}): StageQa {
  const failureModes: FailureMode[] = [];
  const fittedText = [fittedCopy.headline, fittedCopy.deck, ...fittedCopy.proofPoints, fittedCopy.cta, fittedCopy.ctaDetail ?? ""].filter(Boolean);
  const generatedText = [...copy.subheadOptions, copy.body, ...copy.bullets].filter(Boolean);
  const fittedBoundary = findBrandBoundaryTerms(request.brand, fittedText.join(" "), request);
  const generatedBoundary = findBrandBoundaryTerms(request.brand, generatedText.join(" "), request);

  if (fittedBoundary.leakedTerms.length) {
    failureModes.push(
      failureMode(
        "sibling_brand_leakage",
        "block",
        "fitCopy",
        `${request.brand} fitted copy includes sibling-brand term(s): ${fittedBoundary.leakedTerms.slice(0, 4).join(", ")}.`,
        "finalReview",
      ),
    );
  } else if (generatedBoundary.leakedTerms.length) {
    failureModes.push(
      failureMode(
        "sibling_brand_leakage",
        "warn",
        "generateCopy",
        `${request.brand} generated copy includes sibling-brand term(s) that were filtered before layout: ${generatedBoundary.leakedTerms
          .slice(0, 4)
          .join(", ")}.`,
        "fitCopy",
      ),
    );
  }

  if (internalScaffoldFooter(fittedCopy.footer) || internalScaffoldFooter(copy.footer)) {
    failureModes.push(
      failureMode(
        "internal_scaffold_footer",
        "block",
        fittedCopy.footer ? "fitCopy" : "generateCopy",
        "Internal review/source-evidence footer text must not be part of production artifact copy.",
        "finalReview",
      ),
    );
  }

  if (ctaDetailDuplicates(fittedCopy.cta, fittedCopy.ctaDetail)) {
    failureModes.push(
      failureMode(
        "duplicate_cta_detail",
        "block",
        "fitCopy",
        "CTA detail repeats the same action as the CTA button.",
        "layoutQa",
      ),
    );
  }

  if (careSemanticDrift(fittedCopy, request)) {
    failureModes.push(
      failureMode(
        "semantic_drift",
        "warn",
        "fitCopy",
        "CARE Coaching deck drifted toward generic professional learning instead of Coaching and the Three Cs.",
        "brandBoundary",
      ),
    );
  }

  const fittedDangling = fittedText.filter(hasDanglingFragment);
  const generatedDangling = generatedText.filter(hasDanglingFragment);
  const dangling = [...fittedDangling, ...generatedDangling];
  if (dangling.length) {
    failureModes.push(
      failureMode(
        "dangling_fragment",
        fittedDangling.length ? "block" : "warn",
        fittedDangling.length ? "fitCopy" : "generateCopy",
        `Copy contains incomplete or awkward fragment(s): ${dangling.slice(0, 2).map(cleanQaText).join(" | ")}`,
        "layoutQa",
      ),
    );
  }

  const repairedMismatch = fittedText.find((item) => repairKnownTruncations(item) !== cleanQaText(item));
  if (repairedMismatch) {
    failureModes.push(
      failureMode(
        "awkward_truncation",
        "block",
        "fitCopy",
        `Copy appears truncated: ${cleanQaText(repairedMismatch)}`,
        "layoutQa",
      ),
    );
  }

  const repeats = repeatedMeaning([fittedCopy.deck, ...fittedCopy.proofPoints]);
  if (repeats.length) {
    failureModes.push(
      failureMode(
        "repeated_copy",
        "warn",
        "fitCopy",
        "Deck and proof copy repeat the same idea instead of creating a clear message hierarchy.",
        "compositionScore",
      ),
    );
  }

  const generatedRepeats = repeatedMeaning(generatedText);
  if (generatedRepeats.length) {
    failureModes.push(
      failureMode(
        "repetitive_generated_copy",
        "warn",
        "generateCopy",
        "Generated copy repeats the same source idea across body, subhead, or bullets before copy-fit.",
        "fitCopy",
      ),
    );
  }

  const missingTerms = missingPreferredTerms(fittedCopy, request);
  if (!hasAnyPreferredTerm(fittedCopy, request)) {
    failureModes.push(
      failureMode(
        "weak_brand_specificity",
        "warn",
        "fitCopy",
        `${request.brand} fitted copy is missing several preferred terms: ${missingTerms.join(", ")}.`,
        "brandBoundary",
      ),
    );
  }

  return stageQa({
    question: "Would I send this copy to the WCEPS team without apology?",
    failureModes,
    metrics: {
      fittedTextCount: fittedText.length,
      generatedTextCount: generatedText.length,
      missingPreferredTerms: missingTerms,
    },
  });
}
