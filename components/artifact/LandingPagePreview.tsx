import { ArtifactPreviewFrame } from "./ArtifactPreviewFrame";

type LandingPagePreviewProps = {
  brandName: string;
  headline: string;
  subheadline?: string;
  primaryAction?: string;
  secondaryAction?: string;
  featureBlocks?: Array<{
    title: string;
    body: string;
  }>;
  footerNote?: string;
  visualUrl?: string;
  visualAlt?: string;
  logoUrl?: string;
};

export function LandingPagePreview({
  brandName,
  headline,
  subheadline,
  primaryAction,
  secondaryAction,
  featureBlocks = [],
  footerNote,
  visualUrl,
  visualAlt,
  logoUrl
}: LandingPagePreviewProps) {
  if (visualUrl) {
    return (
      <ArtifactPreviewFrame
        title={headline}
        eyebrow={brandName}
        note="Studio composite with app-locked logo and CTA"
        accent="teal"
        footer={footerNote ? <p className="text-xs text-slate-500">{footerNote}</p> : null}
        className="min-h-[520px]"
      >
        <article className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-950 shadow-sm">
          <img src={visualUrl} alt={visualAlt || headline} className="aspect-[3/2] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/82 via-slate-950/38 to-transparent" />
          <div className="absolute left-5 top-5 max-w-xl rounded-md bg-white/94 p-4 shadow-sm backdrop-blur">
            {logoUrl ? (
              <img src={logoUrl} alt={`${brandName} logo`} className="max-h-11 max-w-56 object-contain" />
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0081A4]">{brandName}</p>
            )}
            <h4 className="mt-4 text-3xl font-semibold leading-tight text-[#142836]">{headline}</h4>
            {subheadline ? <p className="mt-2 text-sm leading-6 text-slate-700">{subheadline}</p> : null}
            {primaryAction ? (
              <div className="mt-4 w-fit rounded-md bg-[#0081A4] px-4 py-3 text-sm font-semibold text-white shadow-sm">
                {primaryAction}
              </div>
            ) : null}
          </div>
        </article>
      </ArtifactPreviewFrame>
    );
  }

  return (
    <ArtifactPreviewFrame
      title={headline}
      eyebrow={brandName}
      note={subheadline}
      accent="teal"
      footer={footerNote ? <p className="text-xs text-slate-500">{footerNote}</p> : null}
      className="min-h-[520px]"
    >
      <div className="flex h-full flex-col gap-5 rounded-md border border-slate-200 bg-slate-950 text-white">
        <div className="grid gap-5 p-5 sm:grid-cols-[1.1fr_.9fr]">
          <div className="grid content-start gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`${brandName} logo`} className="max-h-12 max-w-60 rounded-sm bg-white/95 p-2" />
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">{brandName}</p>
            )}
            <h4 className="max-w-2xl text-3xl font-semibold leading-tight">{headline}</h4>
            {subheadline ? <p className="max-w-2xl text-sm leading-6 text-slate-300">{subheadline}</p> : null}
          </div>
          {visualUrl ? (
            <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
              <img src={visualUrl} alt={visualAlt || ""} className="aspect-[4/3] h-full w-full object-cover" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 px-5">
          {primaryAction ? (
            <span className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">{primaryAction}</span>
          ) : null}
          {secondaryAction ? (
            <span className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100">
              {secondaryAction}
            </span>
          ) : null}
        </div>

        <div className="mt-auto grid gap-3 p-5 sm:grid-cols-3">
          {featureBlocks.map((block) => (
            <article key={`${block.title}-${block.body}`} className="rounded-md border border-slate-800 bg-slate-900/80 p-4">
              <h5 className="text-sm font-semibold text-white">{block.title}</h5>
              <p className="mt-2 text-sm leading-6 text-slate-300">{block.body}</p>
            </article>
          ))}
        </div>
      </div>
    </ArtifactPreviewFrame>
  );
}
