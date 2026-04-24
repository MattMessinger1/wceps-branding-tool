import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { exportHtml } from "@/lib/export";
import { generateArtifact } from "@/lib/generation/generateArtifact";
import { GeneratedArtifactSchema, type GeneratedArtifact, type StageQa } from "@/lib/schema/generatedArtifact";
import { examplesDir, publishedTraceDatasetsDir, traceDatasetsDir } from "@/lib/storage/paths";

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

type StageQaManifest = {
  status?: string;
  score?: number;
  issues?: string[];
  warnings?: string[];
  failureModes?: NonNullable<GeneratedArtifact["failureModes"]>;
  metrics?: Record<string, unknown>;
};

type TraceDatasetEntry = {
  artifactId: string;
  sourceRequestId?: string;
  brand: string;
  artifactType: string;
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
  copyQualityQa: StageQaManifest;
  visualQa: StageQaManifest;
  renderQa: StageQaManifest;
  failureModes: NonNullable<GeneratedArtifact["failureModes"]>;
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPercent(value: number | undefined) {
  if (typeof value !== "number") return "n/a";
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function hrefFromRunDir(filePath: string, runDir: string) {
  return path.relative(runDir, filePath).split(path.sep).map(encodeURIComponent).join("/");
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

function stageQaManifest(qa: StageQa | undefined): StageQaManifest {
  if (!qa) return {};

  return {
    status: qa.status,
    score: qa.score,
    issues: qa.issues,
    warnings: qa.warnings,
    failureModes: qa.failureModes,
    metrics: qa.metrics,
  };
}

function failureBadgeHtml(entry: TraceDatasetEntry) {
  if (!entry.failureModes.length) {
    return `<span class="badge ok">No attributed failures</span>`;
  }

  return entry.failureModes
    .map(
      (failure) =>
        `<span class="badge ${failure.severity}">${escapeHtml(failure.id)} · introduced at ${escapeHtml(failure.introducedAt)}${
          failure.missedBy ? ` · missed by ${escapeHtml(failure.missedBy)}` : ""
        }</span>`,
    )
    .join("");
}

function renderIndexHtml(params: {
  datasetId: string;
  createdAt: string;
  projectName: string;
  orgName: string;
  experimentName: string;
  entries: TraceDatasetEntry[];
  runDir: string;
  manifestJsonPath: string;
  manifestJsonlPath: string;
}) {
  const rows = params.entries
    .map((entry) => {
      const score = formatPercent(entry.layoutQa.sendability);
      const artifactHref = hrefFromRunDir(entry.artifactHtmlPath, params.runDir);
      const jsonHref = hrefFromRunDir(entry.artifactFilePath, params.runDir);
      const warnings = entry.review.warnings.length ? entry.review.warnings.join("; ") : "No warnings";
      const issues = entry.review.issues.length ? entry.review.issues.join("; ") : "No issues";
      const traceLink = entry.braintrust.link;
      const failureModes = failureBadgeHtml(entry);

      return `<article class="card">
        <div>
          <p class="eyebrow">${escapeHtml(entry.brand)} · ${escapeHtml(entry.artifactType)}</p>
          <h2>${escapeHtml(entry.artifactId)}</h2>
          <p class="meta">Review: <strong>${escapeHtml(entry.review.status)}</strong> · Layout QA: <strong>${escapeHtml(entry.layoutQa.status ?? "n/a")}</strong> · Copy QA: <strong>${escapeHtml(entry.copyQualityQa.status ?? "n/a")}</strong> · Visual QA: <strong>${escapeHtml(entry.visualQa.status ?? "n/a")}</strong> · Render QA: <strong>${escapeHtml(entry.renderQa.status ?? "n/a")}</strong> · Sendability: <strong>${escapeHtml(score)}</strong></p>
          <div class="badges">${failureModes}</div>
          <p class="fine"><strong>Warnings:</strong> ${escapeHtml(warnings)}</p>
          <p class="fine"><strong>Issues:</strong> ${escapeHtml(issues)}</p>
        </div>
        <div class="actions">
          <a href="${artifactHref}" target="_blank" rel="noreferrer">Open Artifact</a>
          <a href="${jsonHref}" target="_blank" rel="noreferrer">Artifact JSON</a>
          ${
            traceLink
              ? `<a href="${escapeHtml(traceLink)}" target="_blank" rel="noreferrer">Braintrust Trace</a>`
              : `<span class="missing">No trace link</span>`
          }
        </div>
      </article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(params.datasetId)}</title>
  <style>
    :root { color-scheme: light; --ink:#142836; --muted:#53657a; --line:#dfe7ee; --paper:#f6f2ed; --blue:#338bad; --teal:#67c3c9; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing:0; }
    main { max-width:1120px; margin:0 auto; padding:48px 24px 64px; }
    header { margin-bottom:28px; }
    h1 { margin:0 0 10px; font-size:34px; line-height:1.08; }
    h2 { margin:4px 0 8px; font-size:19px; line-height:1.25; }
    p { margin:0; }
    .lead { max-width:760px; color:var(--muted); font-size:16px; line-height:1.6; }
    .toolbar { display:flex; flex-wrap:wrap; gap:10px; margin-top:22px; }
    .toolbar a, .actions a { display:inline-flex; align-items:center; min-height:38px; padding:9px 13px; border-radius:8px; background:#fff; border:1px solid var(--line); color:var(--ink); font-weight:750; text-decoration:none; }
    .toolbar a:hover, .actions a:hover { border-color:var(--blue); color:var(--blue); }
    .grid { display:grid; gap:14px; }
    .card { display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:20px; align-items:start; padding:18px; background:#fff; border:1px solid var(--line); border-radius:10px; box-shadow:0 10px 30px rgba(20,40,54,.07); }
    .eyebrow { margin:0; color:var(--blue); font-size:12px; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
    .meta { color:var(--muted); line-height:1.55; }
    .fine { margin-top:8px; color:#65758a; font-size:13px; line-height:1.45; }
    .badges { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
    .badge { display:inline-flex; align-items:center; border-radius:999px; padding:5px 9px; font-size:11px; font-weight:800; border:1px solid var(--line); background:#f8fafc; color:#475569; }
    .badge.warn { background:#fffbeb; border-color:#fde68a; color:#92400e; }
    .badge.block { background:#fef2f2; border-color:#fecaca; color:#991b1b; }
    .badge.ok { background:#ecfdf5; border-color:#a7f3d0; color:#047857; }
    .actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; max-width:360px; }
    .missing { display:inline-flex; align-items:center; min-height:38px; padding:9px 13px; border-radius:8px; background:#f1f5f9; color:#64748b; font-weight:750; }
    @media (max-width:760px) {
      main { padding:32px 16px 48px; }
      .card { grid-template-columns:1fr; }
      .actions { justify-content:flex-start; max-width:none; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">${escapeHtml(params.orgName)} · ${escapeHtml(params.projectName)}</p>
      <h1>Artifact Trace Dataset</h1>
      <p class="lead">Open an artifact to inspect the rendered output, then open the matching Braintrust trace to see the generation, copy-fit, prompt, layout QA, and sendability metadata for the same artifact.</p>
      <div class="toolbar">
        <a href="${hrefFromRunDir(params.manifestJsonPath, params.runDir)}" target="_blank" rel="noreferrer">Manifest JSON</a>
        <a href="${hrefFromRunDir(params.manifestJsonlPath, params.runDir)}" target="_blank" rel="noreferrer">Manifest JSONL</a>
      </div>
    </header>
    <section class="grid">
      ${rows}
    </section>
  </main>
</body>
</html>`;
}

async function main() {
  const shouldSendToBraintrust = process.argv.includes("--braintrust");
  const shouldPublishDataset = process.argv.includes("--publish");
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
  const htmlDir = path.join(runDir, "html");
  const manifestJsonPath = path.join(runDir, "manifest.json");
  const manifestJsonlPath = path.join(runDir, "manifest.jsonl");
  const indexHtmlPath = path.join(runDir, "index.html");

  const raw = await readFile(path.join(examplesDir, "sample-requests.json"), "utf8");
  const requests = JSON.parse(raw) as SampleRequest[];

  await mkdir(artifactsDir, { recursive: true });
  await mkdir(htmlDir, { recursive: true });

  const entries: TraceDatasetEntry[] = [];

  for (const request of requests) {
    const artifact = await generateArtifact(request);
    const safeArtifact = GeneratedArtifactSchema.parse(redactSensitiveData(artifact));
    const artifactFilePath = path.join(artifactsDir, `${artifact.id}.json`);
    const artifactFileRelativePath = path.relative(process.cwd(), artifactFilePath);
    const artifactHtmlPath = path.join(htmlDir, `${artifact.id}.html`);
    const artifactHtmlRelativePath = path.relative(process.cwd(), artifactHtmlPath);

    await writeFile(artifactFilePath, `${JSON.stringify(safeArtifact, null, 2)}\n`, "utf8");
    await writeFile(artifactHtmlPath, exportHtml(safeArtifact), "utf8");

    entries.push({
      artifactId: artifact.id,
      sourceRequestId: request.id,
      brand: artifact.brand,
      artifactType: artifact.artifactType,
      artifactFilePath,
      artifactFileRelativePath,
      artifactHtmlPath,
      artifactHtmlRelativePath,
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
      copyQualityQa: stageQaManifest(artifact.copyQualityQa),
      visualQa: stageQaManifest(artifact.visualQa),
      renderQa: stageQaManifest(artifact.renderQa),
      failureModes: artifact.failureModes ?? [],
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
  await writeFile(
    indexHtmlPath,
    renderIndexHtml({
      datasetId: runId,
      createdAt: manifest.createdAt,
      projectName: manifest.projectName,
      orgName: manifest.orgName,
      experimentName,
      entries,
      runDir,
      manifestJsonPath,
      manifestJsonlPath,
    }),
    "utf8",
  );

  console.log(`Saved trace dataset to ${runDir}`);
  console.log(`Open artifact/trace index: ${indexHtmlPath}`);

  if (shouldPublishDataset) {
    const publishedDir = path.join(publishedTraceDatasetsDir, runId);
    await mkdir(publishedTraceDatasetsDir, { recursive: true });
    await rm(publishedDir, { recursive: true, force: true });
    await cp(runDir, publishedDir, { recursive: true });
    console.log(`Published trace dataset to ${publishedDir}`);
    console.log(`App route: /trace-datasets/${runId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
