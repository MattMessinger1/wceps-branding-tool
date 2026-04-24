import type { FailureMode, StageQa } from "@/lib/schema/generatedArtifact";

export type QaStatus = "pass" | "warn" | "block";

export function cleanQaText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

export function normalizeQaText(value: string) {
  return cleanQaText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function qaWords(value: string) {
  return normalizeQaText(value).split(/\s+/).filter(Boolean);
}

export function clampQaScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function statusFromFailures(failureModes: FailureMode[], score: number): QaStatus {
  if (failureModes.some((failure) => failure.severity === "block")) return "block";
  if (failureModes.length || score < 90) return "warn";
  return "pass";
}

export function stageQa({
  question,
  baseScore = 100,
  failureModes,
  metrics,
}: {
  question: string;
  baseScore?: number;
  failureModes: FailureMode[];
  metrics?: Record<string, unknown>;
}): StageQa {
  const penalty = failureModes.reduce((sum, failure) => sum + (failure.severity === "block" ? 30 : 12), 0);
  const score = clampQaScore(baseScore - penalty);
  const status = statusFromFailures(failureModes, score);

  return {
    question,
    score,
    status,
    issues: failureModes.filter((failure) => failure.severity === "block").map((failure) => failure.message),
    warnings: failureModes.filter((failure) => failure.severity === "warn").map((failure) => failure.message),
    failureModes,
    metrics,
  };
}

export function failureMode(
  id: string,
  severity: FailureMode["severity"],
  introducedAt: string,
  message: string,
  missedBy?: string,
  label?: string,
): FailureMode {
  return { id, label, severity, introducedAt, missedBy, message };
}

export function collectFailureModes(...qas: Array<StageQa | undefined>) {
  const byKey = new Map<string, FailureMode>();

  for (const qa of qas) {
    for (const failure of qa?.failureModes ?? []) {
      const key = `${failure.id}:${failure.introducedAt}:${failure.message}`;
      if (!byKey.has(key)) byKey.set(key, failure);
    }
  }

  return [...byKey.values()];
}

export function similarIntent(left: string, right: string) {
  const stopWords = new Set(["a", "an", "and", "for", "of", "the", "to", "with", "your"]);
  const leftWords = new Set(qaWords(left).filter((word) => word.length > 2 && !stopWords.has(word)));
  const rightWords = new Set(qaWords(right).filter((word) => word.length > 2 && !stopWords.has(word)));
  if (!leftWords.size || !rightWords.size) return false;
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  const smaller = Math.min(leftWords.size, rightWords.size);
  return shared / smaller >= 0.7;
}

export function hasDanglingFragment(value: string) {
  const normalized = cleanQaText(value);
  return (
    /\b(?:a|an|and|by|for|from|in|of|on|or|the|to|with)[.!?]?$/i.test(normalized) ||
    /\bteaching,\s*learning[.!?]?$/i.test(normalized) ||
    /\bconsulting,\s*coaching[.!?]?$/i.test(normalized) ||
    /\bfit in their[.!?]?$/i.test(normalized) ||
    /,\s*$/.test(normalized)
  );
}

export function repairKnownTruncations(value: string) {
  return cleanQaText(value)
    .replace(/\bstandards-aligned teaching,\s*learning[.!?]?$/i, "standards-aligned teaching, learning, and assessment.")
    .replace(/\bteaching,\s*learning[.!?]?$/i, "teaching, learning, and assessment.")
    .replace(/\bConsulting,\s*Coaching[.!?]?$/i, "Consulting, Coaching, and Continuous Learning.")
    .replace(/\bcurrent WIDA English Language Development[.!?]?$/i, "current WIDA English Language Development Standards Framework.")
    .replace(/\bfit in their[.!?]?$/i, "fit in their program.")
    .replace(/\bPRIME V1\/V2[.!?]?$/i, "PRIME V1 and PRIME V2.");
}
