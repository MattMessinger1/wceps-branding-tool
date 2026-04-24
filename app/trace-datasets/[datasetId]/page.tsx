import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { listTraceDatasets, readTraceDataset } from "@/lib/trace-datasets";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function score(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value)}%` : "n/a";
}

function qaLabel(status: string | undefined, scoreValue?: number) {
  return `${status ?? "n/a"}${typeof scoreValue === "number" ? ` · ${score(scoreValue)}` : ""}`;
}

export default async function TraceDatasetPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params;
  if (datasetId === "latest") {
    const [latest] = await listTraceDatasets();
    if (latest) redirect(`/trace-datasets/${latest.datasetId}`);
  }

  const manifest = await readTraceDataset(datasetId).catch(() => undefined);
  if (!manifest) notFound();

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-7 px-5 py-8">
        <div className="grid gap-4">
          <Link href="/trace-datasets" className="w-fit text-sm font-semibold text-[#338bad] hover:underline">
            Back to trace runs
          </Link>
          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0081A4]">
              {manifest.orgName} · {manifest.projectName}
            </p>
            <h1 className="max-w-5xl text-4xl font-semibold leading-tight text-[#142836]">{manifest.datasetId}</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-700">
              {manifest.artifactCount} artifacts generated on {formatDate(manifest.createdAt)}. Open an artifact trace bundle to inspect the rendered artifact,
              pipeline trace, ImageGen stage trace, JSON, QA, and failure attribution together.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {manifest.artifacts.map((artifact) => (
            <article key={artifact.artifactId} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[#338bad]">
                  {artifact.brand} · {artifact.artifactType}
                  {artifact.designRecipeId ? ` · ${artifact.designRecipeId}` : ""}
                </p>
                <h2 className="text-xl font-semibold text-[#142836]">{artifact.artifactId}</h2>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Review: {artifact.review.status}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Layout QA: {artifact.layoutQa.status ?? "n/a"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Copy QA: {qaLabel(artifact.copyQualityQa?.status, artifact.copyQualityQa?.score)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Visual QA: {qaLabel(artifact.visualQa?.status, artifact.visualQa?.score)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Render QA: {qaLabel(artifact.renderQa?.status, artifact.renderQa?.score)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Model QA: {qaLabel(artifact.modelQa?.status, artifact.modelQa?.score)}
                  </span>
                  <span className="rounded-full bg-[#eef9f2] px-3 py-1 text-[#2f7a4f]">Sendability: {score(artifact.layoutQa.sendability)}</span>
                </div>
                {artifact.failureModes?.length ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {artifact.failureModes.map((failure) => (
                      <span
                        key={`${failure.id}-${failure.introducedAt}-${failure.message}`}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          failure.severity === "block" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
                        }`}
                        title={failure.message}
                      >
                        {failure.id} · introduced at {failure.introducedAt}
                        {failure.missedBy ? ` · missed by ${failure.missedBy}` : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-emerald-700">No attributed failure modes.</p>
                )}
                {artifact.review.warnings.length ? (
                  <p className="text-sm leading-6 text-slate-600">
                    <strong>Warnings:</strong> {artifact.review.warnings.join("; ")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <Link
                  href={`/trace-datasets/${manifest.datasetId}/trace/${artifact.artifactId}`}
                  target="_blank"
                  className="inline-flex h-10 items-center rounded-lg bg-[#338bad] px-4 text-sm font-bold text-white"
                >
                  Artifact trace bundle
                </Link>
                <Link
                  href={`/trace-datasets/${manifest.datasetId}/artifact/${artifact.artifactId}`}
                  target="_blank"
                  className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-[#142836]"
                >
                  Preview only
                </Link>
                <Link
                  href={`/trace-datasets/${manifest.datasetId}/artifact/${artifact.artifactId}/json`}
                  target="_blank"
                  className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-[#142836]"
                >
                  JSON
                </Link>
                {artifact.braintrust.link ? (
                  <a
                    href={artifact.braintrust.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-[#142836]"
                  >
                    Pipeline trace
                  </a>
                ) : null}
                {artifact.imageJobs?.find((job) => job.link)?.link ? (
                  <a
                    href={artifact.imageJobs.find((job) => job.link)?.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-[#142836]"
                  >
                    ImageGen stage trace
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
