import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { getBrandLogoPublicPathForArtifact } from "@/lib/brands/brandAssets";
import { ComposedArtifactPreview } from "./index";

export function ArtifactRenderer({ artifact }: { artifact: GeneratedArtifact }) {
  const logoVariantId = (artifact.request as { logoVariant?: string } | undefined)?.logoVariant;
  const logoUrl = getBrandLogoPublicPathForArtifact(artifact.brand, artifact.artifactType, logoVariantId);

  return (
    <div data-artifact-export={artifact.id} className="artifact-export-scope">
      <ComposedArtifactPreview artifact={artifact} logoUrl={logoUrl} />
    </div>
  );
}
