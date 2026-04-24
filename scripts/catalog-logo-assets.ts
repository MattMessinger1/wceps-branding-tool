import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type LogoBackground = "light" | "dark" | "image" | "any";
type LogoLockup = "horizontal" | "vertical" | "stacked" | "icon" | "wordmark";
type LogoColorMode = "full-color" | "white" | "black" | "one-color";

type LogoManifestEntry = {
  id: string;
  brandName: string;
  label: string;
  publicPath: string;
  sourceUrl: string;
  sourceFolderId: string;
  originalFilename: string;
  sourcePath: string;
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

const defaultSourceRoot = "/Users/mattmessinger/Desktop/WCEPS Logos and Brand Guides";
const sourceRoot = process.argv[2] ?? process.env.LOGO_SOURCE_DIR ?? defaultSourceRoot;
const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, "public", "brand-logos");
const manifestPath = path.join(projectRoot, "data", "processed", "logo-manifest.json");

const sourceFolders = [
  {
    id: "wceps-logo-artifacts-primary",
    label: "WCEPS logo artifacts",
    folderId: "1SgL4c_ACulFF4D5Rn9q5DR3KmIn8c8nr",
    url: "https://drive.google.com/drive/u/0/folders/1SgL4c_ACulFF4D5Rn9q5DR3KmIn8c8nr",
  },
  {
    id: "wceps-logo-artifacts-secondary",
    label: "WCEPS logo artifacts 2",
    folderId: "1Cl_mXicY_w6yOlp1iOL60WyN8B4LBXl7",
    url: "https://drive.google.com/drive/folders/1Cl_mXicY_w6yOlp1iOL60WyN8B4LBXl7",
  },
  {
    id: "wceps-logo-artifacts-tertiary",
    label: "WCEPS logo artifacts 3",
    folderId: "1ot2hL4NELhEQZYb5E47GBNOlfN5jUJtD",
    url: "https://drive.google.com/drive/folders/1ot2hL4NELhEQZYb5E47GBNOlfN5jUJtD",
  },
] as const;

const brandSlugs: Record<string, string> = {
  "CARE Coaching": "care-coaching",
  CCNA: "ccna",
  WCEPS: "wceps",
  "WIDA PRIME": "wida-prime",
  WebbAlign: "webbalign",
  CALL: "call",
};

const seedAssets = [
  {
    brandName: "WebbAlign",
    sourceFile: path.join(projectRoot, "public", "brand-logos", "webbalign.png"),
    sourceUrl:
      "https://d2nms5m2lns5tc.cloudfront.net/assets/webbalign/WebbAlign_logo-b2e8d921159d6097f15e3862e38b8f512a7a274b0d76a897d2019ee650a07a85.png",
  },
  {
    brandName: "CALL",
    sourceFile: path.join(projectRoot, "public", "brand-logos", "call.png"),
    sourceUrl:
      "https://d2nms5m2lns5tc.cloudfront.net/assets/callsurveyv2/call_logo_full-ac851caaee08dd56a8c9dc651bbe6868adfe333a58a77e8d1f4142f5a3d89497.png",
  },
];

function walk(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((item) => {
      const filePath = path.join(dir, item);
      const stat = statSync(filePath);
      if (stat.isDirectory()) return walk(filePath);
      return stat.isFile() ? [filePath] : [];
    })
    .filter((filePath) => !path.basename(filePath).startsWith("."));
}

function slug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[®™]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function brandFor(filePath: string) {
  const value = filePath.toLowerCase();
  const filename = path.basename(filePath).toLowerCase();
  if (filename.includes("prime") && value.includes("wida")) return "WIDA PRIME";
  if (value.includes("care")) return "CARE Coaching";
  if (value.includes("pathways") || filename.startsWith("wceps_")) return "WCEPS";
  return "";
}

function sourceFolderIdFor(relativePath: string) {
  if (relativePath.startsWith("1 - Matt")) return "wceps-logo-artifacts-primary";
  if (relativePath.startsWith("CARE Coaching (R)")) return "wceps-logo-artifacts-secondary";
  return "wceps-logo-artifacts-tertiary";
}

function dimensions(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = readFileSync(filePath);

  if (ext === ".png" && buffer.toString("ascii", 1, 4) === "PNG") {
    const colorType = buffer[25];
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      transparent: colorType === 4 || colorType === 6 || buffer.includes(Buffer.from("tRNS")),
    };
  }

  if (ext === ".svg") {
    const svg = buffer.toString("utf8");
    const width = Number(svg.match(/\bwidth="([\d.]+)/)?.[1]);
    const height = Number(svg.match(/\bheight="([\d.]+)/)?.[1]);
    const viewBox = svg.match(/\bviewBox="[\d.\s-]+ ([\d.]+) ([\d.]+)"/);
    return {
      width: Number.isFinite(width) && width > 0 ? width : Number(viewBox?.[1] ?? 0),
      height: Number.isFinite(height) && height > 0 ? height : Number(viewBox?.[2] ?? 0),
      transparent: true,
    };
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
          transparent: false,
        };
      }
      offset += 2 + length;
    }
  }

  return { width: 0, height: 0, transparent: false };
}

function lockupFor(filePath: string, width: number, height: number): LogoLockup {
  const value = filePath.toLowerCase();
  if (value.includes("vertical")) return "vertical";
  if (value.includes("stacked")) return "stacked";
  if (value.includes("icon")) return "icon";
  if (value.includes("wordmark")) return "wordmark";
  if (width && height && width / height < 1.8) return "stacked";
  return "horizontal";
}

function colorModeFor(filePath: string): LogoColorMode {
  const value = filePath.toLowerCase();
  if (value.includes("white") || value.includes("reversed")) return "white";
  if (value.includes("black")) return "black";
  if (value.includes("one-color") || value.includes("onecolor")) return "one-color";
  return "full-color";
}

function backgroundFor(colorMode: LogoColorMode): LogoBackground {
  if (colorMode === "white") return "dark";
  return "light";
}

function suitabilityFor(colorMode: LogoColorMode, transparent: boolean): LogoBackground[] {
  if (colorMode === "white") return ["dark", "image"];
  if (colorMode === "black") return ["light"];
  return transparent ? ["light", "image"] : ["light"];
}

function labelFor(entry: Pick<LogoManifestEntry, "lockup" | "colorMode" | "hasTransparentBackground" | "backgroundSuitability">) {
  const lockup = entry.lockup === "vertical" ? "Vertical" : entry.lockup === "stacked" ? "Stacked" : "Horizontal";
  const color = entry.colorMode === "full-color" ? "full color" : entry.colorMode;
  const transparency = entry.hasTransparentBackground ? "transparent" : "opaque";
  const backgrounds = `${entry.backgroundSuitability.join("/")} backgrounds`;
  return `${lockup} ${color} · ${transparency} · ${backgrounds}`;
}

function priorityFor(filePath: string, format: string, lockup: LogoLockup, colorMode: LogoColorMode) {
  const value = filePath.toLowerCase();
  let score = 50;
  if (format === "svg") score += 35;
  if (format === "png") score += 25;
  if (format === "jpg" || format === "jpeg") score += 5;
  if (lockup === "horizontal") score += 24;
  if (lockup === "stacked" || lockup === "vertical") score += 12;
  if (colorMode === "full-color") score += 18;
  if (colorMode === "white" || colorMode === "black") score += 12;
  if (value.includes("notag") || value.includes("no-tag") || value.includes("no_tagline")) score += 8;
  if (value.includes("tagline") || value.includes("voice")) score -= 8;
  if (value.includes("small")) score -= 12;
  if (value.includes("whitebg") || value.includes("blackbg") || value.includes("background")) score -= 18;
  return score;
}

function usageFor(brandName: string, lockup: LogoLockup, colorMode: LogoColorMode) {
  if (brandName === "CCNA") return "CCNA uses CARE Coaching logo variants until a dedicated CCNA mark is approved.";
  if (colorMode === "white") return "Use on dark or high-contrast image backgrounds.";
  if (colorMode === "black") return "Use when one-color black reproduction is required.";
  if (lockup === "vertical" || lockup === "stacked") return "Use when space is compact or square/stacked placement is preferred.";
  return "Default logo for light or quiet image backgrounds.";
}

function sourceUrlFor(filePath: string, brandName: string) {
  if (brandName === "WIDA PRIME") return "https://www.widaprime.org/correlated-instructional-materials";
  if (brandName === "CARE Coaching" || brandName === "CCNA") return "https://www.wcepspathways.org/service-offerings/care-coaching/";
  if (brandName === "WCEPS") return "https://www.wcepspathways.org";
  return sourceFolders[0].url;
}

function copyAndBuildEntry(filePath: string, brandName: string, sourceFolderId: string, sourceUrl = sourceUrlFor(filePath, brandName)): LogoManifestEntry | undefined {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  if (!["png", "jpg", "jpeg", "svg"].includes(ext)) return undefined;

  const { width, height, transparent } = dimensions(filePath);
  const lockup = lockupFor(filePath, width, height);
  const colorMode = colorModeFor(filePath);
  const background = backgroundFor(colorMode);
  const backgroundSuitability = suitabilityFor(colorMode, transparent);
  const brandSlug = brandSlugs[brandName];
  const sourceRelative = path.relative(sourceRoot, filePath);
  const originalFilename = path.basename(filePath);
  const filenameSlug = slug(path.basename(filePath, path.extname(filePath))) || "logo";
  const publicRelative = path.join("brand-logos", brandSlug, `${filenameSlug}.${ext}`);
  const publicPath = `/${publicRelative.split(path.sep).join("/")}`;
  const destPath = path.join(projectRoot, "public", publicRelative);

  mkdirSync(path.dirname(destPath), { recursive: true });
  copyFileSync(filePath, destPath);

  const entry = {
    id: `${brandSlug}-${filenameSlug}-${ext}`,
    brandName,
    label: "",
    publicPath,
    sourceUrl,
    sourceFolderId,
    originalFilename,
    sourcePath: sourceRelative.startsWith("..") ? filePath : sourceRelative,
    fileFormat: ext,
    width,
    height,
    hasTransparentBackground: transparent,
    background,
    backgroundSuitability,
    lockup,
    colorMode,
    usage: usageFor(brandName, lockup, colorMode),
    priority: priorityFor(filePath, ext, lockup, colorMode),
  };

  return {
    ...entry,
    label: labelFor(entry),
  };
}

function ccnaAliasFor(entry: LogoManifestEntry): LogoManifestEntry {
  const publicPath = entry.publicPath.replace("/brand-logos/care-coaching/", "/brand-logos/ccna/");
  const destPath = path.join(projectRoot, "public", publicPath.replace(/^\//, ""));
  const sourcePath = path.join(projectRoot, "public", entry.publicPath.replace(/^\//, ""));
  mkdirSync(path.dirname(destPath), { recursive: true });
  copyFileSync(sourcePath, destPath);

  return {
    ...entry,
    id: entry.id.replace(/^care-coaching-/, "ccna-"),
    brandName: "CCNA",
    label: entry.label.replace(/^Horizontal|^Vertical|^Stacked/, (match) => `CARE ${match.toLowerCase()}`),
    publicPath,
    sourceUrl: "https://www.wcepspathways.org/service-offerings/care-coaching-needs-assessment-ccna/",
    originalFilename: entry.originalFilename,
    usage: "CCNA uses CARE Coaching logo variants until a dedicated CCNA mark is approved.",
    priority: entry.priority - 2,
  };
}

if (!existsSync(sourceRoot)) {
  throw new Error(`Logo source folder does not exist: ${sourceRoot}`);
}

const discovered = walk(sourceRoot)
  .map((filePath) => {
    const brandName = brandFor(filePath);
    if (!brandName) return undefined;
    return copyAndBuildEntry(filePath, brandName, sourceFolderIdFor(path.relative(sourceRoot, filePath)));
  })
  .filter((entry): entry is LogoManifestEntry => Boolean(entry));

const careAliases = discovered
  .filter((entry) => entry.brandName === "CARE Coaching")
  .map(ccnaAliasFor);

const seeded = seedAssets
  .filter((seed) => existsSync(seed.sourceFile))
  .map((seed) => copyAndBuildEntry(seed.sourceFile, seed.brandName, "wceps-logo-artifacts-primary", seed.sourceUrl))
  .filter((entry): entry is LogoManifestEntry => Boolean(entry));

const byId = new Map<string, LogoManifestEntry>();
for (const entry of [...discovered, ...careAliases, ...seeded]) {
  const current = byId.get(entry.id);
  if (!current || entry.priority > current.priority) byId.set(entry.id, entry);
}

const logos = [...byId.values()].sort((a, b) => a.brandName.localeCompare(b.brandName) || b.priority - a.priority || a.label.localeCompare(b.label));
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceRoot,
  sourceFolders,
  logos,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Cataloged ${logos.length} logo variants from ${sourceRoot}`);
