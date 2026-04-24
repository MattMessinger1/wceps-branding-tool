import { ArtifactRenderer } from "@/components/artifact/ArtifactRenderer";
import { AppShell } from "@/components/layout/AppShell";
import { ClientStoredExport, ExportActions } from "@/components/review";
import { exportHtml, exportReactSection } from "@/lib/export";
import { loadDraft } from "@/lib/storage/drafts";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let artifact;

  try {
    artifact = await loadDraft(id);
  } catch {
    return (
      <AppShell>
        <ClientStoredExport id={id} />
      </AppShell>
    );
  }

  const html = exportHtml(artifact);
  const react = exportReactSection(artifact);
  const displayHeadline = artifact.fittedCopy?.headline ?? artifact.copy.headlineOptions[0];

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8">
        <header className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0081A4]">Export</p>
          <h1 className="text-3xl font-semibold text-[#142836]">{displayHeadline}</h1>
          <p className="text-sm text-slate-600">
            {artifact.brand} · {artifact.artifactType} · {artifact.audience}
          </p>
        </header>

        {!artifact.review.approved ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Export is blocked until a reviewer approves this artifact.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main>
            <ArtifactRenderer artifact={artifact} />
          </main>
          <aside className="grid content-start gap-3">
            <ExportActions artifact={artifact} html={html} react={react} />
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
