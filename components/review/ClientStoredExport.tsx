"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtifactRenderer } from "@/components/artifact/ArtifactRenderer";
import { ExportActions } from "@/components/review/ExportActions";
import { exportHtml, exportReactSection } from "@/lib/export";
import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { GeneratedArtifactSchema } from "@/lib/schema/generatedArtifact";

function storageKey(id: string) {
  return `wceps:draft:${id}`;
}

export function ClientStoredExport({ id }: { id: string }) {
  const [artifact, setArtifact] = useState<GeneratedArtifact | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) {
      setError("This export is not available on the server or in this browser.");
      return;
    }

    try {
      setArtifact(GeneratedArtifactSchema.parse(JSON.parse(raw)));
    } catch {
      setError("This locally stored export could not be read.");
    }
  }, [id]);

  if (error) {
    return (
      <section className="mx-auto grid max-w-3xl gap-4 px-5 py-10">
        <h1 className="text-3xl font-semibold text-[#142836]">Export unavailable</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{error}</p>
        <Link className="w-fit rounded-full bg-[#0081A4] px-5 py-3 text-sm font-semibold text-white" href="/create">
          Create a new draft
        </Link>
      </section>
    );
  }

  if (!artifact) {
    return <p className="px-5 py-10 text-sm text-slate-600">Loading export...</p>;
  }

  const html = exportHtml(artifact);
  const react = exportReactSection(artifact);
  const displayHeadline = artifact.fittedCopy?.headline ?? artifact.copy.headlineOptions[0];

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0081A4]">Export</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#142836]">{displayHeadline}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {artifact.brand} · {artifact.artifactType} · {artifact.audience}
          </p>
        </div>
        <Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white" href={`/review/${id}`}>
          Back to review
        </Link>
      </header>

      {!artifact.review.approved ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Export is blocked until this artifact is approved on the review page.
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
  );
}
