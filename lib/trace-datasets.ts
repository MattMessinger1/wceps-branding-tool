import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { publishedTraceDatasetsDir, traceDatasetsDir } from "@/lib/storage/paths";

export type TraceDatasetEntry = {
  artifactId: string;
  sourceRequestId?: string;
  brand: string;
  artifactType: string;
  designRecipeId?: string;
  artifactFilePath: string;
  artifactFileRelativePath: string;
  artifactHtmlPath: string;
  artifactHtmlRelativePath: string;
  braintrust: {
    orgName: string;
    projectName: string;
    experimentName: string;
    traceName: string;
    loggingEnabled: boolean;
    rowId?: string;
    spanId?: string;
    rootSpanId?: string;
    link?: string;
    mode?: string;
    promptVersion?: string;
    promptLength?: number;
    promptTokenBudget?: number;
    evidenceIds: string[];
    contextAttachmentNames: string[];
    retryCount?: number;
    traceVersion?: string;
  };
  imageJobs?: Array<{
    jobId?: string;
    model?: string;
    size?: string;
    quality?: string;
    outputFormat?: string;
    link?: string;
  }>;
  layoutQa: {
    status?: string;
    overall?: number;
    noTextOverflow?: number;
    noCtaCollision?: number;
    proofLineWidth?: number;
    logoOnce?: number;
    artifactFormatMatch?: number;
    exportReady?: number;
    sendability?: number;
    metrics?: Record<string, unknown>;
  };
  copyQualityQa?: {
    status?: string;
    score?: number;
    issues?: string[];
    warnings?: string[];
    failureModes?: FailureModeEntry[];
    metrics?: Record<string, unknown>;
  };
  visualQa?: {
    status?: string;
    score?: number;
    issues?: string[];
    warnings?: string[];
    failureModes?: FailureModeEntry[];
    metrics?: Record<string, unknown>;
  };
  renderQa?: {
    status?: string;
    score?: number;
    issues?: string[];
    warnings?: string[];
    failureModes?: FailureModeEntry[];
    metrics?: Record<string, unknown>;
  };
  failureModes?: FailureModeEntry[];
  review: {
    status: string;
    issues: string[];
    warnings: string[];
  };
};

export type FailureModeEntry = {
  id: string;
  label?: string;
  severity: "warn" | "block";
  introducedAt: string;
  missedBy?: string;
  message: string;
};

export type TraceDatasetManifest = {
  datasetId: string;
  createdAt: string;
  projectName: string;
  orgName: string;
  experimentName: string;
  artifactCount: number;
  artifacts: TraceDatasetEntry[];
};

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "");
}

function datasetPath(datasetId: string) {
  return path.join(traceDatasetsDir, safeSegment(datasetId));
}

const datasetRoots = [traceDatasetsDir, publishedTraceDatasetsDir];

async function findDatasetPath(datasetId: string) {
  const safeId = safeSegment(datasetId);

  for (const root of datasetRoots) {
    const candidate = path.join(root, safeId);
    try {
      await stat(path.join(candidate, "manifest.json"));
      return candidate;
    } catch {
      // Try the next dataset source.
    }
  }

  return datasetPath(datasetId);
}

export async function listTraceDatasets() {
  const namesByRoot = await Promise.all(
    datasetRoots.map(async (root) => ({
      root,
      names: await readdir(root).catch(() => []),
    })),
  );

  const datasets = await Promise.all(
    namesByRoot.flatMap(({ root, names }) =>
      names
        .filter((name) => name.endsWith("-artifact-trace-dataset"))
        .map(async (name) => {
          const manifestPath = path.join(root, name, "manifest.json");
          try {
            const contents = await readFile(manifestPath, "utf8");
            const manifest = JSON.parse(contents) as TraceDatasetManifest;
            const stats = await stat(manifestPath);
            return {
              datasetId: manifest.datasetId,
              createdAt: manifest.createdAt,
              artifactCount: manifest.artifactCount,
              projectName: manifest.projectName,
              orgName: manifest.orgName,
              modifiedAt: stats.mtime.toISOString(),
            };
          } catch {
            return undefined;
          }
        }),
    ),
  );

  const deduped = new Map<string, NonNullable<(typeof datasets)[number]>>();
  for (const dataset of datasets) {
    if (!dataset) continue;
    if (!deduped.has(dataset.datasetId)) deduped.set(dataset.datasetId, dataset);
  }

  return [...deduped.values()]
    .filter((dataset): dataset is NonNullable<typeof dataset> => Boolean(dataset))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function readTraceDataset(datasetId: string): Promise<TraceDatasetManifest> {
  const root = await findDatasetPath(datasetId);
  const manifestPath = path.join(root, "manifest.json");
  const contents = await readFile(manifestPath, "utf8");
  return JSON.parse(contents) as TraceDatasetManifest;
}

export async function readTraceArtifact(datasetId: string, artifactId: string) {
  const manifest = await readTraceDataset(datasetId);
  const artifact = manifest.artifacts.find((entry) => entry.artifactId === artifactId);
  if (!artifact) return undefined;

  const root = await findDatasetPath(datasetId);
  const artifactPath = path.join(root, "artifacts", `${safeSegment(artifactId)}.json`);
  const contents = await readFile(artifactPath, "utf8");
  return {
    entry: artifact,
    json: contents,
  };
}

export async function readTraceArtifactHtml(datasetId: string, artifactId: string) {
  const manifest = await readTraceDataset(datasetId);
  const artifact = manifest.artifacts.find((entry) => entry.artifactId === artifactId);
  if (!artifact) return undefined;

  const root = await findDatasetPath(datasetId);
  const htmlPath = path.join(root, "html", `${safeSegment(artifactId)}.html`);
  return readFile(htmlPath, "utf8");
}

function imageContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

export async function readTraceDatasetImage(datasetId: string, imageName: string) {
  const root = await findDatasetPath(datasetId);
  const safeName = safeSegment(imageName);
  if (!safeName) return undefined;

  const imagePath = path.join(root, "images", safeName);
  const buffer = await readFile(imagePath);
  return {
    buffer,
    contentType: imageContentType(safeName),
  };
}
