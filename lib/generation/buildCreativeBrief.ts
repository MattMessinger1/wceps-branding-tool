import { filterBrandBoundaryEvidence, filterBrandBoundaryItems } from "@/lib/brands/brandBoundary";
import { resolveArtifactTemplate } from "@/lib/brands/resolveArtifactTemplate";
import { selectAudienceMessaging } from "@/lib/brands/selectAudienceMessaging";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";
import { CreativeBriefSchema, type CreativeBrief } from "@/lib/schema/creativeBrief";

export function buildCreativeBrief(pack: BrandPack, request: ArtifactRequest): CreativeBrief {
  const audience = selectAudienceMessaging(pack, request);
  const template = resolveArtifactTemplate(pack, request.artifactType);
  const keyMessages = [
    ...audience.approvedMessages.slice(0, 3),
    pack.positioning.oneLiner,
  ].filter(Boolean);
  const filteredKeyMessages = filterBrandBoundaryItems(pack.brandName, keyMessages, request);
  const proofPoints = filterBrandBoundaryItems(pack.brandName, pack.proofPoints, request);
  const evidence = filterBrandBoundaryEvidence(pack.brandName, pack.sourceEvidence, request).slice(0, 4);

  return CreativeBriefSchema.parse({
    artifactType: request.artifactType,
    brand: pack.brandName,
    audience: request.audience || audience.name,
    objective: request.goal,
    keyMessages: filteredKeyMessages.slice(0, 3),
    proofPoints: proofPoints.slice(0, 3),
    cta: request.cta || audience.ctaSuggestions[0],
    visualDirection: [
      ...pack.visualStyle.imageKeywords.slice(0, 3),
      ...pack.visualStyle.layoutKeywords.slice(0, 2),
    ],
    layoutRecommendation: template.recommendation,
    sourceEvidenceIds: evidence.map((item) => item.id),
  });
}
