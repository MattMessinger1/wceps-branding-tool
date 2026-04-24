import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { crawlSite } from "@/lib/scraping/crawlSite";
import { extractEvidence } from "@/lib/scraping/extractBrandPages";
import { extractLearningLibraryAssets } from "@/lib/scraping/extractLearningLibraryAssets";
import { inferStyleTokens } from "@/lib/scraping/inferStyleTokens";
import { normalizeContent } from "@/lib/scraping/normalizeContent";
import { rawSnapshotsDir } from "@/lib/storage/paths";

export async function POST() {
  const snapshots = await crawlSite();
  const pages = snapshots.map(normalizeContent);
  const evidence = extractEvidence(pages);
  const assets = extractLearningLibraryAssets(pages);
  const styleTokens = inferStyleTokens(pages);
  const runDir = path.join(rawSnapshotsDir, new Date().toISOString().replace(/[:.]/g, "-"));

  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, "snapshots.json"), `${JSON.stringify(snapshots, null, 2)}\n`, "utf8");
  await writeFile(path.join(runDir, "normalized-pages.json"), `${JSON.stringify(pages, null, 2)}\n`, "utf8");
  await writeFile(path.join(runDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(path.join(runDir, "learning-library-assets.json"), `${JSON.stringify(assets, null, 2)}\n`, "utf8");
  await writeFile(path.join(runDir, "style-tokens.json"), `${JSON.stringify(styleTokens, null, 2)}\n`, "utf8");

  return NextResponse.json({
    savedTo: runDir,
    pages: pages.length,
    evidenceBlocks: evidence.length,
    learningLibraryAssets: assets.length,
  });
}
