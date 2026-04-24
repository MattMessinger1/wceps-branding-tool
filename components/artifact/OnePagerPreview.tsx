import { ArtifactPreviewFrame } from "./ArtifactPreviewFrame";

type OnePagerPreviewProps = {
  brandName?: string;
  audience?: string;
  title: string;
  summary?: string;
  keyPoints?: string[];
  evidence?: string[];
  nextStep?: string;
  footerNote?: string;
  visualUrl?: string;
  visualAlt?: string;
  logoUrl?: string;
};

export function OnePagerPreview({
  brandName = "WCEPS",
  audience,
  title,
  summary,
  keyPoints = [],
  evidence = [],
  nextStep,
  footerNote,
  visualUrl,
  visualAlt,
  logoUrl
}: OnePagerPreviewProps) {
  if (visualUrl) {
    return (
      <ArtifactPreviewFrame
        title={title}
        eyebrow={`${brandName} generated artifact`}
        note="Studio composite with app-locked logo and CTA"
        accent="green"
        footer={footerNote ? <p className="text-xs text-slate-500">{footerNote}</p> : null}
      >
        <article className="relative overflow-hidden rounded-md border border-[#d9dee4] bg-white shadow-sm">
          <img src={visualUrl} alt={visualAlt || title} className="w-full bg-white object-contain" />
          <div className="absolute left-5 top-5 max-w-[58%] rounded-md bg-white/94 p-4 shadow-sm backdrop-blur">
            {logoUrl ? (
              <img src={logoUrl} alt={`${brandName} logo`} className="max-h-11 max-w-56 object-contain" />
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0081A4]">{brandName}</p>
            )}
            <h4 className="mt-3 text-xl font-semibold leading-tight text-[#142836]">{title}</h4>
            {audience ? <p className="mt-1 text-xs font-semibold text-slate-600">For {audience}</p> : null}
          </div>
          <div className="absolute inset-x-5 bottom-5 grid gap-3 rounded-md bg-white/94 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 md:grid-cols-2">
              {keyPoints.slice(0, 4).map((point, index) => (
                <p key={`${point}-${index}`} className="rounded-md border border-slate-200 bg-white/88 p-3 text-xs leading-5 text-slate-700">
                  {point}
                </p>
              ))}
            </div>
            {nextStep ? (
              <div className="w-fit rounded-md bg-[#0081A4] px-4 py-3 text-sm font-semibold text-white shadow-sm">
                {nextStep}
              </div>
            ) : null}
          </div>
        </article>
      </ArtifactPreviewFrame>
    );
  }

  return (
    <ArtifactPreviewFrame
      title={title}
      eyebrow={`${brandName} one-pager`}
      note={summary}
      accent="green"
      footer={footerNote ? <p className="text-xs text-slate-500">{footerNote}</p> : null}
    >
      <article className="overflow-hidden rounded-md border border-[#d9dee4] bg-white shadow-sm">
        <section className="grid bg-[#F7FBFA] md:grid-cols-[.95fr_1.05fr]">
          <div className="grid content-between gap-8 p-7">
            <div className="grid gap-4">
              <div>
                {logoUrl ? (
                  <img src={logoUrl} alt={`${brandName} logo`} className="max-h-12 max-w-60 object-contain" />
                ) : (
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0081A4]">{brandName}</p>
                )}
                {audience ? <p className="mt-2 text-sm font-medium text-slate-600">For {audience}</p> : null}
              </div>
              <h3 className="text-4xl font-semibold leading-tight text-[#142836]">{title}</h3>
              {summary ? <p className="text-base leading-7 text-slate-700">{summary}</p> : null}
            </div>
            {nextStep ? (
              <div className="w-fit rounded-md bg-[#0081A4] px-4 py-3 text-sm font-semibold text-white shadow-sm">{nextStep}</div>
            ) : null}
          </div>
          <div className="min-h-[340px] border-t border-slate-200 bg-[#EAF3F1] md:border-l md:border-t-0">
            <div className="grid h-full min-h-[340px] place-items-center p-8 text-center text-sm font-medium text-[#40606A]">
              ImageGen artifact will appear here.
            </div>
          </div>
        </section>

        <section className="grid gap-6 p-7">
          <div className="grid gap-4 md:grid-cols-2">
            {keyPoints.map((point, index) => (
              <article key={`${point}-${index}`} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-[#5EA974]">0{index + 1}</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{point}</p>
              </article>
            ))}
          </div>

          {evidence.length ? (
            <div className="rounded-md border border-[#DDE8E2] bg-[#F6FAF7] p-5">
              <h4 className="text-base font-semibold text-[#142836]">Source-grounded support</h4>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {evidence.map((item) => (
                  <li key={item} className="text-sm leading-6 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </article>
    </ArtifactPreviewFrame>
  );
}
