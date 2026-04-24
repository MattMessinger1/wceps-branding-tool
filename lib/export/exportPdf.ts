import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";

export function exportPdfPlaceholder(artifact: GeneratedArtifact) {
  return {
    format: "pdf",
    message:
      "PDF export is browser-rendered from the exact artifact canvas. Approve the draft, then use Download PDF on the review or export page.",
    artifactId: artifact.id,
  };
}
