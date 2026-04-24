import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { GeneratedCopy } from "@/lib/schema/generatedArtifact";

export function buildLayoutSpec(request: ArtifactRequest, copy: GeneratedCopy) {
  if (request.artifactType === "landing-page") {
    return {
      kind: "landing-page",
      sections: ["hero", "feature blocks", "evidence", "cta"],
      headline: copy.headlineOptions[0],
      density: "medium",
    };
  }

  if (request.artifactType === "one-pager") {
    return {
      kind: "one-pager",
      sections: ["summary", "key points", "evidence", "next step"],
      headline: copy.headlineOptions[0],
      density: "high-scan",
    };
  }

  return {
    kind: "flyer",
    sections: ["headline", "audience", "support blocks", "cta"],
    headline: copy.headlineOptions[0],
    density: "light",
  };
}
