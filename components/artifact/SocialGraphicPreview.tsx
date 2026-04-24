import { ArtifactPreviewFrame } from "./ArtifactPreviewFrame";

type SocialGraphicPreviewProps = {
  brandName: string;
  title: string;
  subtitle?: string;
  audience?: string;
  cta?: string;
  footerNote?: string;
  visualUrl?: string;
  visualAlt?: string;
  logoUrl?: string;
};

export function SocialGraphicPreview({
  brandName,
  title,
  subtitle,
  audience,
  cta,
  footerNote,
  visualUrl,
  visualAlt,
  logoUrl,
}: SocialGraphicPreviewProps) {
  return (
    <ArtifactPreviewFrame
      title={title}
      eyebrow={`${brandName} social square`}
      note={visualUrl ? "ImageGen-designed 1:1 social graphic" : "1:1 social graphic preview"}
      accent="teal"
      footer={footerNote ? <p className="text-xs text-slate-500">{footerNote}</p> : null}
      className="max-w-3xl"
    >
      {visualUrl ? (
        <article className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-md border border-[#d9dee4] bg-white shadow-sm">
          <img src={visualUrl} alt={visualAlt || title} className="h-full w-full object-contain" />
          <div className="absolute inset-5 grid content-between rounded-md bg-white/10 p-2">
            <div className="flex items-start justify-between gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={`${brandName} logo`} className="max-h-10 max-w-44 rounded-sm bg-white/94 p-2 shadow-sm" />
              ) : (
                <p className="rounded-full bg-white/92 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0081A4] shadow-sm">
                  {brandName}
                </p>
              )}
              {audience ? <p className="rounded-full bg-white/92 px-3 py-2 text-xs font-semibold text-[#142836] shadow-sm">{audience}</p> : null}
            </div>
            <div className="max-w-[90%] rounded-md bg-white/94 p-4 shadow-sm backdrop-blur">
              <h3 className="text-3xl font-semibold leading-tight text-[#142836]">{title}</h3>
              {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-700">{subtitle}</p> : null}
              {cta ? <p className="mt-4 w-fit rounded-md bg-[#0081A4] px-4 py-3 text-sm font-semibold text-white">{cta}</p> : null}
            </div>
          </div>
        </article>
      ) : (
        <article className="mx-auto grid aspect-square w-full max-w-[640px] content-between overflow-hidden rounded-md bg-[#142836] p-8 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9CE3E9]">{brandName}</p>
            {audience ? <p className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/85">{audience}</p> : null}
          </div>
          <div className="grid gap-4">
            <h3 className="max-w-xl text-4xl font-semibold leading-tight">{title}</h3>
            {subtitle ? <p className="max-w-lg text-base leading-7 text-white/80">{subtitle}</p> : null}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-5">
            <div className="h-12 w-12 rounded-full bg-[#F4C95D]" />
            {cta ? <p className="rounded-md bg-[#3EB3BD] px-4 py-3 text-sm font-semibold text-[#142836]">{cta}</p> : null}
          </div>
        </article>
      )}
    </ArtifactPreviewFrame>
  );
}
