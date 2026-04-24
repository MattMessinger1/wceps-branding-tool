import { filterBrandBoundaryItems } from "@/lib/brands/brandBoundary";
import { selectAudienceMessaging } from "@/lib/brands/selectAudienceMessaging";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";
import type { CreativeBrief } from "@/lib/schema/creativeBrief";
import { GeneratedCopySchema, type GeneratedCopy } from "@/lib/schema/generatedArtifact";

function concise(value: string, max = 170) {
  const cleaned = value.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const cut = slice.lastIndexOf(" ") > 32 ? slice.slice(0, slice.lastIndexOf(" ")) : slice;
  return `${cut.replace(/[,:;–-]+$/g, "").replace(/[.!?]+$/g, "")}.`;
}

function isGenericProductionInstruction(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
  return [
    "create a useful brand-safe artifact",
    "create a useful artifact",
    "useful brand-safe artifact",
    "brand-safe artifact",
    "professional artifact",
  ].some((phrase) => normalized.includes(phrase));
}

function headlineOptions(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest) {
  const topic = request.topic.replace(/\.$/, "");
  const audience = brief.audience.replace(/\.$/, "");
  const base = {
    "CARE Coaching": [
      "Every Voice, Every Classroom, Every Learner",
      "Customized coaching for educator growth",
      "Consulting, coaching, and continuous learning for your team",
    ],
    CCNA: [
      "Turn insight into instructional impact",
      "Action-based data for school improvement",
      "Shared starting points for improving instruction",
    ],
    WebbAlign: [
      "Use DOK to strengthen alignment",
      "Build a more coherent learning system",
      "Straight-from-the-source DOK support",
    ],
    CALL: [
      "Focus on leadership. Focus on improvement.",
      "Leadership for learning, grounded in feedback",
      "A practical system for school improvement planning",
    ],
    "WIDA PRIME": [
      "Understand instructional materials alignment",
      "Explore WIDA PRIME correlations and alignments",
      "Clear information for instructional materials decisions",
    ],
    WCEPS: [
      "Chart your course with WCEPS",
      "Research-based pathways for education teams",
      "Customized support for schools and districts",
    ],
  }[pack.brandName] ?? [`${pack.brandName} support for ${audience}`, concise(topic, 62), pack.positioning.oneLiner];

  return request.keyMessage && !isGenericProductionInstruction(request.keyMessage)
    ? [concise(request.keyMessage, 72), ...base].slice(0, 3)
    : base;
}

export function generateCopy(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest): GeneratedCopy {
  const audience = selectAudienceMessaging(pack, request);
  const keyMessages = filterBrandBoundaryItems(pack.brandName, brief.keyMessages, request);
  const proofPoints = filterBrandBoundaryItems(pack.brandName, brief.proofPoints, request);
  const audienceMessages = filterBrandBoundaryItems(pack.brandName, audience.approvedMessages, request);
  const summaries = filterBrandBoundaryItems(
    pack.brandName,
    [pack.positioning.summary, pack.positioning.oneLiner, ...audienceMessages],
    request,
  );
  const primaryMessage = keyMessages[0] ?? summaries[0] ?? pack.positioning.oneLiner;
  const proof = proofPoints[0] ?? summaries[1] ?? pack.positioning.summary;
  const topicSentence = request.topic
    ? `For ${brief.audience}, this draft focuses on ${request.topic}.`
    : `For ${brief.audience}, this draft focuses on ${pack.topics.slice(0, 3).join(", ")}.`;

  const body =
    brief.artifactType === "landing-page"
      ? `${pack.positioning.summary} ${topicSentence} The page should guide readers from the local challenge to a clear next step while keeping the message grounded in WCEPS source language.`
      : `${primaryMessage} ${topicSentence} ${proof}`;

  const copy = {
    headlineOptions: headlineOptions(pack, brief, request),
    subheadOptions: [
      concise(summaries[0] ?? pack.positioning.summary, 150),
      concise(primaryMessage, 150),
      concise(audienceMessages[0] ?? summaries[1] ?? pack.positioning.oneLiner, 150),
    ],
    body: concise(body, brief.artifactType === "landing-page" ? 420 : 300),
    bullets: [
      ...keyMessages.slice(0, 3),
      ...proofPoints.slice(0, 2),
    ]
      .filter(Boolean)
      .slice(0, brief.artifactType === "flyer" ? 4 : 6)
      .map((item) => concise(item, 150)),
    cta: request.cta || brief.cta || audience.ctaSuggestions[0],
    footer:
      "Draft generated for internal review. Claims should remain tied to the source evidence shown with this artifact.",
  };

  return GeneratedCopySchema.parse(copy);
}
