import type { StudioPromptContract } from "./buildPromptContract";
import type { GeneratedCopy, ArtifactCritique, CompositionScore, LayoutContract } from "@/lib/schema/generatedArtifact";

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function critiqueLayoutContract(layout: LayoutContract) {
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestedFixes: string[] = [];
  const appElements = layout.appOwnedElements.join(" ");
  const imageElements = layout.imageGenOwnedElements.join(" ");
  const appOwnsLogo = includesAny(appElements, ["logo", "wordmark"]);
  const imageOwnsLogo = includesAny(imageElements, ["official logo", "final logo", "logo lockup", "wordmark lockup"]);

  if (appOwnsLogo && imageOwnsLogo) {
    warnings.push("Logo duplication risk: both the app and ImageGen are assigned final logo ownership.");
    suggestedFixes.push("Keep the official logo app-owned and ask ImageGen to reserve a clean logo zone instead.");
  }

  if (!layout.exactTextPriority.length) {
    issues.push("No exact text priority was defined for the artifact.");
    suggestedFixes.push("Add headline, audience, CTA, and only the highest-priority support copy.");
  }

  return { issues, warnings, suggestedFixes };
}

export function critiqueArtifactQuality(
  copy: GeneratedCopy,
  layout: LayoutContract,
  promptContracts: StudioPromptContract[],
  compositionScore?: CompositionScore,
): ArtifactCritique {
  const layoutCritique = critiqueLayoutContract(layout);
  const issues = [...layoutCritique.issues];
  const warnings = [...layoutCritique.warnings];
  const suggestedFixes = [...layoutCritique.suggestedFixes];
  const headline = copy.headlineOptions[0]?.trim();
  const cta = copy.cta?.trim();

  if (!headline) {
    issues.push("Headline is missing from the copy fit pass.");
    suggestedFixes.push("Use the key message as the primary headline.");
  }

  if (!cta || cta.length < 6) {
    warnings.push("CTA is weak or missing from the copy fit pass.");
    suggestedFixes.push("Use a concrete request, demo, conversation, or inquiry CTA.");
  }

  for (const contract of promptContracts) {
    if (contract.promptLength > contract.promptTokenBudget) {
      warnings.push(
        `Prompt contract exceeds the target length (${contract.promptLength}/${contract.promptTokenBudget} characters).`,
      );
      suggestedFixes.push("Reduce evidence, notes, or lower-priority text before sending to ImageGen.");
      break;
    }

    if (contract.prompt.includes("data:") || contract.prompt.toLowerCase().includes("base64")) {
      issues.push("Attachment data leaked into the text prompt instead of being passed as a reference input.");
      suggestedFixes.push("Keep attachments as input files/images and reference them by filename in the prompt.");
      break;
    }
  }

  if (!promptContracts.some((contract) => contract.evidenceIds.length > 0)) {
    warnings.push("No source evidence IDs were included in the studio prompt contract.");
    suggestedFixes.push("Attach the most relevant brand evidence snippets to the prompt contract.");
  }

  if (compositionScore) {
    issues.push(...compositionScore.issues);
    warnings.push(...compositionScore.warnings);
    if (compositionScore.status !== "pass") {
      suggestedFixes.push("Revise composition until the sendability score passes the WCEPS review threshold.");
    }
  }

  const uniqueIssues = Array.from(new Set(issues));
  const uniqueWarnings = Array.from(new Set(warnings));

  return {
    status: uniqueIssues.length ? "block" : uniqueWarnings.length ? "warn" : "pass",
    issues: uniqueIssues,
    warnings: uniqueWarnings,
    suggestedFixes: Array.from(new Set(suggestedFixes)),
  };
}
