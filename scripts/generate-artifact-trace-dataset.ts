import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateArtifact } from "@/lib/generation/generateArtifact";
import { GeneratedArtifactSchema, type GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { examplesDir, traceDatasetsDir } from "@/lib/storage/paths";

type SampleRequest = {
  id?: string;
  artifactType?: string;
  brand?: string;
  audience?: string;
  keyMessage?: string;
  goal?: string;
  topic?: string;
  cta?: string;
  format?: string;
  toneModifier?: string;
  notes?: string;
  visualInstruction?: string;
  logoVariant?: string;
  colorTheme?: string;
  strictlySourceGrounded?: boolean;
  generateVisual?: boolean;
  contextAttachments?: Array<{ name: string; type: string; dataUrl: string }>;
};

type LayoutQaManifest = {
  status?: string;
  overall?: number;
  noTextOverflow?: number;
  noCtaCollision?: number;
  proofLineWidth?: number;
  logoOnce?: number;
  artifactFormatMatch?: number;
  exportReady?: number;
  sendability?: number;
  metrics?: NonNullable<GeneratedArtifact["layoutQa"]>["metrics"];
};

type TraceDatasetEntry = {
  artifactId: string;
  sourceRequestId?: string;
  brand: string;
  artifactType: string;
  artifactFilePath: string;
  artifactFileRelativePath: string;
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
    mode: GeneratedArtifact["pipelineTrace"] extends undefined ? string | undefined : NonNullable<GeneratedArtifact["pipelineTrace"]>["mode"];
    promptVersion?: string;
    promptLength?: number;
    promptTokenBudget?: number;
    evidenceIds: string[];
    contextAttachmentNames: string[];
    retryCount?: number;
    traceVersion?: string;
  };
  layoutQa: LayoutQaManifest;
  review: {
    status: GeneratedArtifact["review"]["status"];
    issues: string[];
    warnings: string[];
  };
};

function loadEnvLocal() {
  return readFile(path.join(process.cwd(), ".env.local"), "utf8")
    .then((contents) => {
      for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
        process.env[key] ??= value;
      }
    })
    .catch(() => undefined);
}

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function redactSensitiveData(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:")) return "[redacted data url]";
    if (/sk-[a-zA-Z0-9_-]{12,}/.test(value)) return "[redacted secret]";
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactSensitiveData);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(record)) {
    const lower = key.toLowerCase();
    if (lower.includes("apikey") || lower.includes("api_key") || lower === "authorization") {
      next[key] = "[redacted secret]";
      continue;
    }

    if (lower === "dataurl" || lower === "file_data" || lower === "image_url" || lower === "logodataurl") {
      next[key] = "[redacted data url]";
      continue;
    }

    next[key] = redactSensitiveData(item);
  }

  return next;
}

function layoutQaManifest(layoutQa: GeneratedArtifact["layoutQa"]): LayoutQaManifest {
  if (!layoutQa) return {};

  return {
    status: layoutQa.status,
    overall: layoutQa.overall,
    noTextOverflow: layoutQa.noTextOverflow,
    noCtaCollision: layoutQa.noCtaCollision,
    proofLineWidth: layoutQa.proofLineWidth,
    logoOnce: layoutQa.logoOnce,
    artifactFormatMatch: layoutQa.artifactFormatMatch,
    exportReady: layoutQa.exportReady,
    sendability: layoutQa.sendability,
    metrics: layoutQa.metrics,
  };
}

async function main() {
  const shouldSendToBraintrust = process.argv.includes("--braintrust");
  await loadEnvLocal();

  process.env.BRAINTRUST_PROJECT_NAME ||= "Brand Building";
  process.env.BRAINTRUST_ORG_NAME ||= "WCEPS";
  process.env.BRAINTRUST_LOGGING_ENABLED = shouldSendToBraintrust ? "true" : "false";

  if (shouldSendToBraintrust && !process.env.BRAINTRUST_API_KEY) {
    throw new Error("BRAINTRUST_API_KEY is required for npm run generate:trace-dataset -- --braintrust.");
  }

  const experimentName = "Artifact Trace Golden Dataset";
  const runId = `${timestampId()}-artifact-trace-dataset`;
  const runDir = path.join(traceDatasetsDir, runId);
  const artifactsDir = path.join(runDir, "artifacts");
  const manifestJsonPath = path.join(runDir, "manifest.json");
  const manifestJsonlPath = path.join(runDir, "manifest.jsonl");

  const raw = await readFile(path.join(examplesDir, "sample-requests.json"), "utf8");
  const requests = JSON.parse(raw) as SampleRequest[];

  await mkdir(artifactsDir, { recursive: true });

  const entries: TraceDatasetEntry[] = [];

  for (const request of requests) {
    const artifact = await generateArtifact(request);
    const safeArtifact = GeneratedArtifactSchema.parse(redactSensitiveData(artifact));
    const artifactFilePath = path.join(artifactsDir, `${artifact.id}.json`);
    const artifactFileRelativePath = path.relative(process.cwd(), artifactFilePath);

    await writeFile(artifactFilePath, `${JSON.stringify(safeArtifact, null, 2)}\n`, "utf8");

    entries.push({
      artifactId: artifact.id,
      sourceRequestId: request.id,
      brand: artifact.brand,
      artifactType: artifact.artifactType,
      artifactFilePath,
      artifactFileRelativePath,
      braintrust: {
        projectName: process.env.BRAINTRUST_PROJECT_NAME || "Brand Building",
        orgName: process.env.BRAINTRUST_ORG_NAME || "WCEPS",
        experimentName,
        traceName: "generateArtifact",
        loggingEnabled: shouldSendToBraintrust,
        rowId: artifact.pipelineTrace?.braintrustTrace?.rowId,
        spanId: artifact.pipelineTrace?.braintrustTrace?.spanId,
        rootSpanId: artifact.pipelineTrace?.braintrustTrace?.rootSpanId,
        link: artifact.pipelineTrace?.braintrustTrace?.link,
        mode: artifact.pipelineTrace?.mode ?? "campaign-art-plate",
        promptVersion: artifact.artPlatePromptVersion ?? artifact.pipelineTrace?.version,
        promptLength: artifact.pipelineTrace?.promptLength,
        promptTokenBudget: artifact.pipelineTrace?.promptTokenBudget,
        evidenceIds: artifact.pipelineTrace?.evidenceIds ?? [],
        contextAttachmentNames: artifact.pipelineTrace?.contextAttachmentNames ?? [],
        retryCount: artifact.pipelineTrace?.retryCount,
        traceVersion: artifact.pipelineTrace?.version,
      },
      layoutQa: layoutQaManifest(artifact.layoutQa),
      review: {
        status: artifact.review.status,
        issues: artifact.review.issues,
        warnings: artifact.review.warnings,
      },
    });

    console.log(`Generated trace golden ${artifact.brand} ${artifact.artifactType}: ${artifact.id}`);
  }

  const manifest = {
    datasetId: runId,
    createdAt: new Date().toISOString(),
    projectName: process.env.BRAINTRUST_PROJECT_NAME || "Brand Building",
    orgName: process.env.BRAINTRUST_ORG_NAME || "WCEPS",
    experimentName,
    artifactCount: entries.length,
    artifacts: entries,
  };

  await writeFile(manifestJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(manifestJsonlPath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");

  console.log(`Saved trace dataset to ${runDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
