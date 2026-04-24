type SourceEvidence = {
  title: string;
  citation: string;
  excerpt?: string;
  url?: string;
};

type SourceEvidencePanelProps = {
  title?: string;
  sources: SourceEvidence[];
  note?: string;
};

export function SourceEvidencePanel({
  title = "Source evidence",
  sources,
  note
}: SourceEvidencePanelProps) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {note ? <p className="mt-1 text-sm text-slate-600">{note}</p> : null}
      </div>

      <div className="grid gap-3">
        {sources.map((source) => (
          <article key={`${source.citation}-${source.title}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{source.title}</h4>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{source.citation}</p>
              </div>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
                >
                  Open source
                </a>
              ) : null}
            </div>
            {source.excerpt ? <p className="mt-3 text-sm leading-6 text-slate-700">{source.excerpt}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
