import { ArtifactPreviewFrame } from "./ArtifactPreviewFrame";

type FlyerSection = {
  heading: string;
  body: string;
};

type FlyerPreviewProps = {
  brandName?: string;
  title: string;
  subtitle?: string;
  audience?: string;
  sections?: FlyerSection[];
  highlights?: string[];
  cta?: string;
  footerNote?: string;
  visualUrl?: string;
  visualAlt?: string;
  logoUrl?: string;
};

export function FlyerPreview({
  brandName = "WCEPS",
  title,
  subtitle,
  audience,
  sections = [],
  highlights = [],
  cta,
  footerNote,
  visualUrl,
  visualAlt,
  logoUrl
}: FlyerPreviewProps) {
  if (visualUrl) {
    return (
      <ArtifactPreviewFrame
        title={title}
        eyebrow={`${brandName} generated artifact`}
        note="Studio composite with app-locked logo and CTA"
        accent="amber"
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
            <div className="grid gap-3 md:grid-cols-3">
              {sections.slice(0, 3).map((section) => (
                <article key={`${section.heading}-${section.body}`} className="rounded-md border border-slate-200 bg-white/88 p-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-[#0081A4]">{section.heading}</h5>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{section.body}</p>
                </article>
              ))}
            </div>
            {cta ? (
              <div className="w-fit rounded-md bg-[#0081A4] px-4 py-3 text-sm font-semibold text-white shadow-sm">
                {cta}
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
      eyebrow={`${brandName} flyer`}
      note={subtitle}
      accent="amber"
      footer={footerNote ? <p className="text-xs text-slate-500">{footerNote}</p> : null}
    >
      <article className="overflow-hidden rounded-md border border-[#d9dee4] bg-white shadow-sm">
        <section className="grid min-h-[380px] bg-[#142836] text-white md:grid-cols-[1fr_.92fr]">
          <div className="grid content-between gap-6 p-7">
            <div className="grid gap-4">
              <div>
                {logoUrl ? (
                  <img src={logoUrl} alt={`${brandName} logo`} className="max-h-12 max-w-60 rounded-sm bg-white/95 p-2" />
                ) : (
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9CE3E9]">{brandName}</p>
                )}
                <p className="mt-2 text-xs font-medium text-white/70">Built for {audience || "education teams"}</p>
              </div>
              <div className="grid gap-3">
                <h3 className="max-w-2xl text-4xl font-semibold leading-tight text-white">{title}</h3>
                {subtitle ? <p className="max-w-xl text-base leading-7 text-white/82">{subtitle}</p> : null}
              </div>
            </div>
            {cta ? (
              <div className="w-fit rounded-md bg-[#F4C95D] px-4 py-3 text-sm font-semibold text-[#142836] shadow-sm">{cta}</div>
            ) : null}
          </div>
          <div className="min-h-[300px] border-t border-white/10 bg-[#EAF3F1] md:border-l md:border-t-0">
            <div className="grid h-full min-h-[300px] place-items-center p-8 text-center text-sm font-medium text-[#40606A]">
              ImageGen artifact will appear here.
            </div>
          </div>
        </section>

        <section className="grid gap-6 p-7">
          {highlights.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {highlights.map((highlight) => (
                <p key={highlight} className="border-l-4 border-[#0081A4] bg-[#F4FAFA] px-4 py-3 text-sm leading-6 text-[#263947]">
                  {highlight}
                </p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {sections.map((section, index) => (
              <article key={`${section.heading}-${section.body}`} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-[#0081A4]">0{index + 1}</p>
                <h4 className="mt-3 text-base font-semibold text-[#142836]">{section.heading}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-700">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      </article>
    </ArtifactPreviewFrame>
  );
}
