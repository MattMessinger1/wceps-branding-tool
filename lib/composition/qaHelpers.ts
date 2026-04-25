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
    /\b(?:across|affect|collaboration|current|including|professional|relevant|reviewed|that|through)[.!?]?$/i.test(normalized) ||
    /\b(?:and the support|to the current|with action-based|that affect|materials that|programs? and services across resources, assessments, professional learning)[.!?]?$/i.test(
      normalized,
    ) ||
    /\b(?:critical leadership|between instructional materials|include reviewed|data relevant|data for school)[.!?]?$/i.test(normalized) ||
    /\bpathway learning through partnership[.!?]?$/i.test(normalized) ||
    /\bteaching,\s*learning[.!?]?$/i.test(normalized) ||
    /\bconsulting,\s*coaching[.!?]?$/i.test(normalized) ||
    /\bfit in their[.!?]?$/i.test(normalized) ||
    /\bchoose a pathway,\s*and continue[.!?]?$/i.test(normalized) ||
    /\bprofessional learning,\s*program[.!?]?$/i.test(normalized) ||
    /\bto\s+(?:align|build|evaluate|guide|identify|review|support)[.!?]?$/i.test(normalized) ||
    /\b(?:help|helps)\s+(?:teams|educators|leaders|users)\s+(?:align|build|evaluate|guide|identify|review|support)[.!?]?$/i.test(normalized) ||
    /,\s*$/.test(normalized)
  );
}

export function repairKnownTruncations(value: string) {
  return cleanQaText(value)
    .replace(/\bstandards-aligned teaching,\s*learning[.!?]?$/i, "standards-aligned teaching, learning, and assessment.")
    .replace(/\bteaching,\s*learning[.!?]?$/i, "teaching, learning, and assessment.")
    .replace(/\bConsulting,\s*Coaching[.!?]?$/i, "Consulting, Coaching, and Continuous Learning.")
    .replace(/\buse the lens of DOK to evaluate[.!?]?$/i, "use DOK to evaluate standards, objectives, assessments, curricula, and materials.")
    .replace(/\bcan help teams build[.!?]?$/i, "can help teams build a calibrated understanding of DOK.")
    .replace(/\bReview assessments, curricula, and instructional materials through[.!?]?$/i, "Review assessments, curricula, and instructional materials for alignment and coherence.")
    .replace(/\bincluding planning, collaboration, feedback[.!?]?$/i, "including planning, collaboration, and feedback.")
    .replace(/\bcurrent WIDA English Language Development[.!?]?$/i, "current WIDA English Language Development Standards Framework.")
    .replace(/\balignment to the current[.!?]?$/i, "alignment to WIDA ELD Standards.")
    .replace(/\bwith action-based[.!?]?$/i, "with action-based data.")
    .replace(/\bfor school improvement and professional[.!?]?$/i, "for school improvement and professional development planning.")
    .replace(/\baction-based data relevant to\b/i, "action-based data for")
    .replace(/\baction-based data for school[.!?]?$/i, "action-based data for school teams' work.")
    .replace(/\baction-based data relevant[.!?]?$/i, "action-based data relevant to school teams' work.")
    .replace(/\binstructional practices that affect[.!?]?$/i, "instructional practices that affect multilingual learner success.")
    .replace(/\bplanning,\s*collaboration[.!?]?$/i, "planning, collaboration, feedback, and leadership routines.")
    .replace(/\bcritical leadership[.!?]?$/i, "critical leadership practices.")
    .replace(/\binclude reviewed[.!?]?$/i, "include reviewed correlations.")
    .replace(/\bSpanish Language[.!?]?$/i, "Spanish Language Development correlations.")
    .replace(/\binstructional materials that[.!?]?$/i, "instructional materials that have completed the PRIME process.")
    .replace(/\bdegree of alignment between instructional materials[.!?]?$/i, "degree of alignment between instructional materials and WIDA ELD Standards.")
    .replace(/\bwith resources, assessments, professional learning[.!?]?$/i, "with resources, assessments, professional learning, and alignment support.")
    .replace(/\bchallenge and the support[.!?]?$/i, "challenge and identify the support your team needs next.")
    .replace(/\bpractical support pathway learning through partnership[.!?]?$/i, "practical support pathway and continue learning through partnership.")
    .replace(/\band other[.!?]?$/i, "and other instructional materials.")
    .replace(/\bchoose a pathway,\s*and continue[.!?]?$/i, "choose a practical support pathway.")
    .replace(/\bprofessional learning,\s*program[.!?]?$/i, "professional learning, and program support.")
    .replace(/\bfit in their[.!?]?$/i, "fit in their program.")
    .replace(/\bPRIME V1\/V2[.!?]?$/i, "PRIME V1 and PRIME V2.");
}
