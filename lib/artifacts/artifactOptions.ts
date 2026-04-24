import type { ArtifactType } from "@/lib/schema/artifactRequest";

export const artifactTypeOptions: Array<{ label: string; value: ArtifactType }> = [
  { label: "Flyer", value: "flyer" },
  { label: "One-pager", value: "one-pager" },
  { label: "Social square", value: "social-graphic" },
  { label: "Landing page", value: "landing-page" },
  { label: "Conference handout", value: "conference-handout" },
  { label: "Proposal cover", value: "proposal-cover" },
  { label: "Email header", value: "email-header" },
  { label: "HTML email announcement", value: "html-email-announcement" },
  { label: "HTML email newsletter", value: "html-email-newsletter" },
  { label: "HTML email event invite", value: "html-email-event-invite" },
];

export function isEmailArtifact(artifactType: string) {
  return artifactType === "email-header" || artifactType.startsWith("html-email-");
}
