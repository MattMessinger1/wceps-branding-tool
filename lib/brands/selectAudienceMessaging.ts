import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";

export function selectAudienceMessaging(pack: BrandPack, request: ArtifactRequest) {
  const target = request.audience.toLowerCase();
  const direct =
    pack.audiences.find((audience) => target.includes(audience.name.toLowerCase())) ??
    pack.audiences.find((audience) =>
      audience.name
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.length > 3 && target.includes(word)),
    );

  return direct ?? pack.audiences[0];
}
