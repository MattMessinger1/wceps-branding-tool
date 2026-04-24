import path from "node:path";

export const projectRoot = process.cwd();
export const dataDir = path.join(projectRoot, "data");
export const brandPacksDir = path.join(dataDir, "processed", "brand-packs");
export const styleDir = path.join(dataDir, "processed", "style");
export const rawSnapshotsDir = path.join(dataDir, "raw", "site-snapshots");
export const draftsDir = path.join(dataDir, "drafts");
export const examplesDir = path.join(dataDir, "examples");
export const traceDatasetsDir = path.join(dataDir, "trace-datasets");
export const publishedTraceDatasetsDir = path.join(dataDir, "published-trace-datasets");

export function safeDraftPath(id: string) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(draftsDir, `${safeId}.json`);
}
