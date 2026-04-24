import type { ArtifactType } from "@/lib/schema/artifactRequest";

const artifactFormats: Record<ArtifactType, string> = {
  flyer: "Letter portrait",
  "one-pager": "Letter portrait",
  "landing-page": "Web page landscape",
  website: "Website page",
  "social-graphic": "Social square 1:1",
  "email-header": "Email header landscape",
  "html-email-announcement": "HTML email announcement",
  "html-email-newsletter": "HTML email newsletter",
  "html-email-event-invite": "HTML email event invite",
  "conference-handout": "Letter portrait",
  "proposal-cover": "Letter portrait",
};

export function resolveArtifactFormat(artifactType: string) {
  return artifactFormats[artifactType as ArtifactType] ?? "Letter portrait";
}
