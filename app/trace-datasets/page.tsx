import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { listTraceDatasets } from "@/lib/trace-datasets";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function TraceDatasetsPage() {
  const datasets = await listTraceDatasets();

  return (
    <AppShell>
      <section className="mx-auto grid max-w-6xl gap-7 px-5 py-8">
        <div className="grid gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#0081A4]">Trace datasets</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#142836]">Artifacts with their matching Braintrust traces.</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-700">
            Open a run, inspect the rendered artifact, then jump into the exact Braintrust trace row that produced it.
          </p>
        </div>

        {datasets.length ? (
          <div className="grid gap-3">
            {datasets.map((dataset) => (
              <Link
                key={dataset.datasetId}
                href={`/trace-datasets/${dataset.datasetId}`}
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#338bad] hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <h2 className="text-lg font-semibold text-[#142836]">{dataset.datasetId}</h2>
                    <p className="text-sm text-slate-600">
                      {dataset.orgName} · {dataset.projectName} · {dataset.artifactCount} artifacts
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e7f6f8] px-3 py-1 text-xs font-bold text-[#126c75]">{formatDate(dataset.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-slate-700">
            No trace datasets found yet. Run <code className="rounded bg-slate-100 px-1.5 py-1">npm run generate:trace-dataset -- --braintrust</code>.
          </div>
        )}
      </section>
    </AppShell>
  );
}
