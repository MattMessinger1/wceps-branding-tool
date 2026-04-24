import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";

export function filenameSafe(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function artifactExportBaseName(artifact: GeneratedArtifact) {
  const headline = artifact.fittedCopy?.headline ?? artifact.copy.headlineOptions[0] ?? artifact.id;
  return filenameSafe(`${artifact.brand}-${artifact.artifactType}-${headline}`) || artifact.id;
}

export function isOfficialExportEnabled(artifact: GeneratedArtifact) {
  return artifact.review.approved;
}
