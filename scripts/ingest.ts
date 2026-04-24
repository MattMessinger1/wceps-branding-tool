import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { crawlSite } from "@/lib/scraping/crawlSite";
import { extractEvidence } from "@/lib/scraping/extractBrandPages";
import { extractLearningLibraryAssets } from "@/lib/scraping/extractLearningLibraryAssets";
import { inferStyleTokens } from "@/lib/scraping/inferStyleTokens";
import { normalizeContent } from "@/lib/scraping/normalizeContent";
import { rawSnapshotsDir } from "@/lib/storage/paths";

async function main() {
  const snapshots = await crawlSite();
  const pages = snapshots.map(normalizeContent);
  const runDir = path.join(rawSnapshotsDir, new Date().toISOString().replace(/[:.]/g, "-"));

  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, "snapshots.json"), `${JSON.stringify(snapshots, null, 2)}\n`, "utf8");
  await writeFile(path.join(runDir, "normalized-pages.json"), `${JSON.stringify(pages, null, 2)}\n`, "utf8");
  await writeFile(path.join(runDir, "evidence.json"), `${JSON.stringify(extractEvidence(pages), null, 2)}\n`, "utf8");
  await writeFile(
    path.join(runDir, "learning-library-assets.json"),
    `${JSON.stringify(extractLearningLibraryAssets(pages), null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(runDir, "style-tokens.json"), `${JSON.stringify(inferStyleTokens(pages), null, 2)}\n`, "utf8");

  console.log(`Saved ingestion run to ${runDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
