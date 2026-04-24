import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { readTraceArtifact, readTraceDataset } from "@/lib/trace-datasets";
import { GeneratedArtifactSchema, type StageQa } from "@/lib/schema/generatedArtifact";

export const dynamic = "force-dynamic";

function score(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value)}%` : "n/a";
}

function statusTone(status?: string) {
  if (status === "block") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function qaLabel(label: string, qa?: StageQa) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(qa?.status)}`}>
      {label}: {qa?.status ?? "n/a"}
      {typeof qa?.score === "number" ? ` · ${score(qa.score)}` : ""}
    </span>
  );
}

function TraceButton({ href, children, primary = false }: { href?: string; children: React.ReactNode; primary?: boolean }) {
  if (!href) {
    return (
      <span className="inline-flex h-10 items-center rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-500">
        {children} unavailable
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold ${
        primary ? "bg-[#338bad] text-white" : "border border-slate-200 bg-white text-[#142836]"
      }`}
    >
      {children}
    </a>
  );
}

function QaPanel({ title, qa }: { title: string; qa?: StageQa }) {
  if (!qa) return null;

  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-base font-semibold text-[#142836]">
        {title} · {qa.status} · {score(qa.score)}
      </summary>
      <p className="mt-2 text-sm leading-6 text-slate-600">{qa.question}</p>
      {qa.issues.length ? (
        <div className="mt-3 grid gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Issues</p>
          <ul className="grid gap-1 text-sm leading-6 text-rose-800">
            {qa.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {qa.warnings.length ? (
        <div className="mt-3 grid gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Warnings</p>
          <ul className="grid gap-1 text-sm leading-6 text-amber-800">
            {qa.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </details>
  );
}

export default async function ArtifactTraceBundlePage({ params }: { params: Promise<{ datasetId: string; artifactId: string }> }) {
  const { datasetId, artifactId } = await params;
  const [manifest, artifactRead] = await Promise.all([
    readTraceDataset(datasetId).catch(() => undefined),
    readTraceArtifact(datasetId, artifactId).catch(() => undefined),
  ]);

  if (!manifest || !artifactRead) notFound();

  const entry = artifactRead.entry;
  const artifact = GeneratedArtifactSchema.parse(JSON.parse(artifactRead.json));
  const imageJob = entry.imageJobs?.find((job) => job.link) ?? entry.imageJobs?.[0];
  const artifactPreviewUrl = `/trace-datasets/${manifest.datasetId}/artifact/${artifact.id}`;
  const artifactJsonUrl = `/trace-datasets/${manifest.datasetId}/artifact/${artifact.id}/json`;
  const imageTraceUrl = imageJob?.link;
  const pipelineTraceUrl = entry.braintrust.link;
  const imageRootSpanId = artifact.imageResults?.find((image) => image.braintrustTrace?.rootSpanId)?.braintrustTrace?.rootSpanId;
  const sameRootTrace = Boolean(entry.braintrust.rootSpanId && imageRootSpanId && entry.braintrust.rootSpanId === imageRootSpanId);

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-7 px-5 py-8">
        <div className="grid gap-4">
          <Link href={`/trace-datasets/${manifest.datasetId}`} className="w-fit text-sm font-semibold text-[#338bad] hover:underline">
            Back to trace run
          </Link>
          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0081A4]">
              Artifact trace bundle · {artifact.brand} · {artifact.artifactType}
            </p>
            <h1 className="max-w-5xl text-4xl font-semibold leading-tight text-[#142836]">{artifact.id}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-700">
              This is the single diagnostic view for the actual artifact. The pipeline trace covers request, copy, design recipe, prompt, and QA.
              The ImageGen stage link is a shortcut to the child span inside the same full artifact pipeline trace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TraceButton href={artifactPreviewUrl} primary>
              Open artifact preview
            </TraceButton>
            <TraceButton href={pipelineTraceUrl}>Pipeline Braintrust trace</TraceButton>
            <TraceButton href={imageTraceUrl}>ImageGen stage trace</TraceButton>
            <TraceButton href={artifactJsonUrl}>Artifact JSON</TraceButton>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <iframe src={artifactPreviewUrl} title={`${artifact.id} preview`} className="h-[760px] w-full rounded-md border border-slate-200 bg-white" />
          </div>

          <aside className="grid content-start gap-4">
            <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-[#142836]">Trace Map</h2>
              <ol className="grid gap-2 text-sm leading-6 text-slate-700">
                <li>
                  <strong>fullArtifactPipeline</strong>: {sameRootTrace ? "ImageGen child span confirmed" : "ImageGen child span not confirmed"}.
                </li>
                <li><strong>fitCopy</strong>: {artifact.pipelineTrace?.braintrustTrace?.link ? "pipeline trace" : "not linked"} · final visible copy.</li>
                <li><strong>buildDesignRecipe</strong>: {artifact.designRecipe?.id ?? "n/a"} · model-assisted creative recipe.</li>
                <li><strong>buildImagePrompt</strong>: {artifact.artPlatePromptVersion ?? "n/a"} · deterministic prompt contract.</li>
                <li><strong>imageJob</strong>: {imageJob?.model ?? "n/a"} · {imageJob?.quality ?? "n/a"} · async ImageGen trace.</li>
                <li><strong>QA</strong>: deterministic checks plus {artifact.modelQa?.metrics?.model ? `${artifact.modelQa.metrics.model}` : "model"} review.</li>
              </ol>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-[#142836]">Quality Signals</h2>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(artifact.review.status)}`}>
                  Review: {artifact.review.status}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(artifact.layoutQa?.status)}`}>
                  Layout QA: {artifact.layoutQa?.status ?? "n/a"} · {score(artifact.layoutQa?.sendability)}
                </span>
                {qaLabel("Copy QA", artifact.copyQualityQa)}
                {qaLabel("Visual QA", artifact.visualQa)}
                {qaLabel("Render QA", artifact.renderQa)}
                {qaLabel("Model QA", artifact.modelQa)}
              </div>
              {artifact.failureModes?.length ? (
                <div className="grid gap-2 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Attributed Failure Modes</p>
                  <div className="flex flex-wrap gap-2">
                    {artifact.failureModes.map((failure) => (
                      <span
                        key={`${failure.id}-${failure.introducedAt}-${failure.message}`}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          failure.severity === "block" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
                        }`}
                        title={failure.message}
                      >
                        {failure.id} · {failure.introducedAt}
                        {failure.missedBy ? ` · missed by ${failure.missedBy}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <QaPanel title="Model QA" qa={artifact.modelQa} />
            <QaPanel title="Copy QA" qa={artifact.copyQualityQa} />
            <QaPanel title="Visual QA" qa={artifact.visualQa} />
            <QaPanel title="Render QA" qa={artifact.renderQa} />
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
