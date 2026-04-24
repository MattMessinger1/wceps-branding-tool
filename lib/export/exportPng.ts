import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";

export function exportPngPlaceholder(artifact: GeneratedArtifact) {
  return {
    format: "png",
    message:
      "PNG export is browser-rendered from the exact artifact canvas. Approve the draft, then use Download PNG on the review or export page.",
    artifactId: artifact.id,
  };
}
