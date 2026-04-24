import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";
import type { CreativeBrief } from "@/lib/schema/creativeBrief";

export function buildCopyPrompt(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest) {
  return [
    `Brand: ${pack.brandName}`,
    `Audience: ${brief.audience}`,
    `Artifact: ${brief.artifactType}`,
    `Objective: ${brief.objective}`,
    `Topic: ${request.topic}`,
    "Use only these approved messages:",
    ...brief.keyMessages.map((message) => `- ${message}`),
    "Avoid:",
    ...pack.avoidPhrases.map((phrase) => `- ${phrase}`),
  ].join("\n");
}
