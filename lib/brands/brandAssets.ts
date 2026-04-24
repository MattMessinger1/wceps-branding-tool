import logoManifest from "@/data/processed/logo-manifest.json";

export type LogoBackground = "light" | "dark" | "image" | "any";
export type LogoPlacement = "header" | "hero" | "footer" | "social" | "email";
export type LogoLockup = "horizontal" | "vertical" | "stacked" | "icon" | "wordmark";
export type LogoColorMode = "full-color" | "white" | "black" | "one-color";

export type LogoSourceFolder = {
  id: string;
  label: string;
  folderId: string;
  url: string;
};

export type BrandLogoVariant = {
  id: string;
  brandName: string;
  label: string;
  publicPath: string;
  sourceUrl: string;
  sourceFolderId: string;
  originalFilename: string;
  sourcePath?: string;
  fileFormat: string;
  width: number;
  height: number;
  hasTransparentBackground: boolean;
  background: LogoBackground;
  backgroundSuitability: LogoBackground[];
  lockup: LogoLockup;
  colorMode: LogoColorMode;
  usage: string;
  priority: number;
};

export type BrandLogoAsset = {
  brandName: string;
  label: string;
  publicPath: string;
  sourceUrl: string;
  sourceFolderUrl?: string;
  variants: BrandLogoVariant[];
};

export type LogoSelectionInput = {
  brandName: string;
  artifactType?: string;
  background?: LogoBackground;
  placement?: LogoPlacement;
  preferredVariantId?: string;
};

type LogoManifest = {
  schemaVersion: number;
  sourceFolders: LogoSourceFolder[];
  logos: BrandLogoVariant[];
};

const manifest = logoManifest as LogoManifest;

export const LOGO_SOURCE_FOLDERS = manifest.sourceFolders;

export const LOGO_ARTIFACTS_DRIVE_URL = LOGO_SOURCE_FOLDERS[0]?.url ?? "";

function sourceFolderUrl(sourceFolderId: string) {
  return LOGO_SOURCE_FOLDERS.find((folder) => folder.id === sourceFolderId)?.url ?? LOGO_ARTIFACTS_DRIVE_URL;
}

function normalizeBrandName(brandName: string) {
  return manifest.logos.some((logo) => logo.brandName === brandName) ? brandName : "WCEPS";
}

function requestedBackgroundFor(input: LogoSelectionInput): LogoBackground {
  if (input.background) return input.background;
  if (input.placement === "social") return "dark";
  if (input.artifactType === "social-graphic") return "dark";
  return "light";
}

function preferredLockups(input: LogoSelectionInput): LogoLockup[] {
  if (input.placement === "social" || input.artifactType === "social-graphic") return ["stacked", "vertical", "horizontal", "icon", "wordmark"];
  if (input.placement === "footer") return ["horizontal", "wordmark", "stacked", "vertical", "icon"];
  return ["horizontal", "wordmark", "stacked", "vertical", "icon"];
}

function backgroundScore(variant: BrandLogoVariant, background: LogoBackground) {
  if (variant.backgroundSuitability.includes(background)) return 70;
  if (background === "image" && variant.hasTransparentBackground) return 45;
  if (variant.backgroundSuitability.includes("any")) return 35;
  if (background === "dark" && variant.colorMode === "white") return 55;
  if (background === "light" && variant.colorMode !== "white") return 35;
  return 0;
}

function colorScore(variant: BrandLogoVariant, background: LogoBackground) {
  if (background === "dark" || background === "image") {
    if (variant.colorMode === "white") return 36;
    if (variant.colorMode === "full-color" && variant.hasTransparentBackground) return 22;
    return 6;
  }

  if (variant.colorMode === "full-color") return 36;
  if (variant.colorMode === "black") return 22;
  return 8;
}

function formatScore(variant: BrandLogoVariant) {
  if (variant.fileFormat === "svg") return 28;
  if (variant.fileFormat === "png") return 20;
  return 4;
}

function logoScore(variant: BrandLogoVariant, input: LogoSelectionInput) {
  const background = requestedBackgroundFor(input);
  const lockups = preferredLockups(input);
  const lockupRank = lockups.indexOf(variant.lockup);
  const lockupScore = lockupRank === -1 ? 0 : (lockups.length - lockupRank) * 8;
  const transparentScore = variant.hasTransparentBackground ? 16 : 0;
  return variant.priority + backgroundScore(variant, background) + colorScore(variant, background) + formatScore(variant) + lockupScore + transparentScore;
}

export function getLogoSourceFolders() {
  return LOGO_SOURCE_FOLDERS;
}

export function getLogoArtifactsDriveUrl() {
  return LOGO_ARTIFACTS_DRIVE_URL;
}

export function getBrandLogoVariants(brandName: string) {
  const resolvedBrand = normalizeBrandName(brandName);
  return manifest.logos
    .filter((logo) => logo.brandName === resolvedBrand)
    .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
}

export function selectOptimalBrandLogo(input: LogoSelectionInput) {
  const variants = getBrandLogoVariants(input.brandName);
  if (!variants.length) return undefined;

  if (input.preferredVariantId) {
    const preferred = variants.find((variant) => variant.id === input.preferredVariantId);
    if (preferred) return preferred;
  }

  return [...variants].sort((a, b) => logoScore(b, input) - logoScore(a, input) || a.label.localeCompare(b.label))[0];
}

export function getBrandLogoAsset(brandName: string): BrandLogoAsset {
  const variant = selectOptimalBrandLogo({ brandName, background: "light", placement: "header" }) ?? selectOptimalBrandLogo({ brandName: "WCEPS", background: "light", placement: "header" });
  const variants = getBrandLogoVariants(brandName);

  if (!variant) {
    return {
      brandName: "WCEPS",
      label: "WCEPS logo",
      publicPath: "",
      sourceUrl: LOGO_ARTIFACTS_DRIVE_URL,
      sourceFolderUrl: LOGO_ARTIFACTS_DRIVE_URL,
      variants: [],
    };
  }

  return {
    brandName: variant.brandName,
    label: variant.label,
    publicPath: variant.publicPath,
    sourceUrl: variant.sourceUrl,
    sourceFolderUrl: sourceFolderUrl(variant.sourceFolderId),
    variants: variants.length ? variants : [variant],
  };
}

export function getBrandLogoPublicPath(brandName: string) {
  return getBrandLogoAsset(brandName).publicPath;
}

export function getBrandLogoVariantPublicPath(brandName: string, variantId?: string) {
  return selectOptimalBrandLogo({
    brandName,
    preferredVariantId: variantId,
    background: "light",
    placement: "header",
  })?.publicPath ?? getBrandLogoPublicPath(brandName);
}

export function getBrandLogoForArtifact(brandName: string, artifactType: string, variantId?: string) {
  return selectOptimalBrandLogo({
    brandName,
    artifactType,
    preferredVariantId: variantId,
    background: artifactType === "social-graphic" ? "dark" : "light",
    placement: artifactType === "social-graphic" ? "social" : artifactType.startsWith("html-email") || artifactType === "email-header" ? "email" : "header",
  });
}

export function getBrandLogoPublicPathForArtifact(brandName: string, artifactType: string, variantId?: string) {
  return getBrandLogoForArtifact(brandName, artifactType, variantId)?.publicPath ?? getBrandLogoVariantPublicPath(brandName, variantId);
}
