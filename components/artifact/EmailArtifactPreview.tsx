import { ArtifactPreviewFrame } from "./ArtifactPreviewFrame";

type EmailArtifactPreviewProps = {
  brandName: string;
  title: string;
  subtitle?: string;
  audience?: string;
  cta?: string;
  body?: string;
  bullets?: string[];
  footerNote?: string;
  visualUrl?: string;
  visualAlt?: string;
  logoUrl?: string;
  variant?: "header" | "announcement" | "newsletter" | "event";
};

export function EmailArtifactPreview({
  brandName,
  title,
  subtitle,
  audience,
  cta,
  body,
  bullets = [],
  footerNote,
  visualUrl,
  visualAlt,
  logoUrl,
  variant = "announcement",
}: EmailArtifactPreviewProps) {
  const isHeader = variant === "header";

  return (
    <ArtifactPreviewFrame
      title={title}
      eyebrow={isHeader ? `${brandName} email header` : `${brandName} HTML email`}
      note={isHeader ? "Email-safe header preview" : "Copy-pasteable HTML email preview"}
      accent="teal"
      footer={footerNote ? <p className="text-xs text-slate-500">{footerNote}</p> : null}
      className="max-w-4xl"
    >
      <article className="mx-auto max-w-[680px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <header className="grid gap-4 bg-[#f7f4ee] px-7 py-6">
          {logoUrl ? (
            <img src={logoUrl} alt={`${brandName} logo`} className="max-h-14 max-w-64 object-contain" />
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0081A4]">{brandName}</p>
          )}
          {audience ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">For {audience}</p> : null}
        </header>

        {visualUrl ? (
          <img src={visualUrl} alt={visualAlt || title} className="aspect-[2/1] w-full bg-slate-100 object-cover" />
        ) : (
          <div className="h-48 bg-[linear-gradient(135deg,#0081A4,#3EB3BD_52%,#F7D470)]" />
        )}

        <section className="grid gap-4 px-7 py-7">
          <h3 className="text-3xl font-semibold leading-tight text-[#142836]">{title}</h3>
          {subtitle ? <p className="text-base leading-7 text-slate-700">{subtitle}</p> : null}
          {!isHeader && body ? <p className="text-sm leading-7 text-slate-700">{body}</p> : null}
          {!isHeader && bullets.length ? (
            <div className="grid gap-3">
              {bullets.slice(0, variant === "newsletter" ? 4 : 3).map((bullet) => (
                <p key={bullet} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {bullet}
                </p>
              ))}
            </div>
          ) : null}
          {cta ? (
            <span className="w-fit rounded-md bg-[#0081A4] px-5 py-3 text-sm font-semibold text-white shadow-sm">
              {cta}
            </span>
          ) : null}
        </section>
      </article>
    </ArtifactPreviewFrame>
  );
}
