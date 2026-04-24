import { getBrandTheme } from "@/lib/brands/brandThemes";
import { resolveCompositionTemplate } from "@/lib/composition";
import { getArtifactAudienceLabel } from "@/lib/review/textEdits";
import type { CompositionTemplate, FittedCopy, GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { ArtifactPreviewFrame } from "./ArtifactPreviewFrame";

type ComposedArtifactPreviewProps = {
  artifact: GeneratedArtifact;
  logoUrl?: string;
};

function fallbackCopy(artifact: GeneratedArtifact): FittedCopy {
  return {
    headline: artifact.copy.headlineOptions[0] ?? artifact.brand,
    deck: artifact.copy.subheadOptions[0] ?? artifact.brief.objective,
    proofPoints: artifact.copy.bullets.slice(0, 3),
    cta: artifact.copy.cta,
    ctaDetail: undefined,
    footer: artifact.copy.footer,
  };
}

function artPlate(visualUrl: string | undefined, alt: string, className = "", opacity = "opacity-95") {
  if (visualUrl) {
    return <img src={visualUrl} alt={alt} className={`absolute inset-0 h-full w-full object-cover ${opacity} ${className}`} />;
  }

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        background:
          "radial-gradient(circle at 78% 18%, rgba(103,195,201,.28), transparent 32%), radial-gradient(circle at 88% 82%, rgba(94,169,116,.20), transparent 34%), linear-gradient(135deg, rgba(255,255,255,.98), rgba(237,248,248,.94) 48%, rgba(247,212,112,.20))",
      }}
    />
  );
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function safeCtaDetail(cta: string, detail?: string) {
  if (!detail) return undefined;
  const ctaText = normalizeText(cta);
  const detailText = normalizeText(detail);
  if (!ctaText || !detailText) return detail;
  if (detailText === ctaText || detailText.includes(ctaText)) return undefined;
  return detail;
}

function Logo({ brandName, logoUrl, dark = false }: { brandName: string; logoUrl?: string; dark?: boolean }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={`${brandName} logo`} className="max-h-12 max-w-60 object-contain" />;
  }

  return <p className={`text-xs font-bold uppercase tracking-[0.2em] ${dark ? "text-white/80" : "text-slate-600"}`}>{brandName}</p>;
}

function headlinePhrases(headline: string) {
  const parts = headline
    .split(",")
    .map((part, index, all) => `${part.trim()}${index < all.length - 1 ? "," : ""}`)
    .filter(Boolean);

  return parts.length >= 2 && parts.length <= 4 ? parts : [headline];
}

function CampaignHeadline({ headline, className }: { headline: string; className: string }) {
  const parts = headlinePhrases(headline);

  return (
    <h1 className={className}>
      {parts.map((part) => (
        <span key={part} className={parts.length > 1 ? "block whitespace-nowrap" : undefined}>
          {part}
        </span>
      ))}
    </h1>
  );
}

function ProofCluster({
  items,
  theme,
  dark = false,
  compact = false,
}: {
  items: string[];
  theme: ReturnType<typeof getBrandTheme>;
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`grid ${compact ? "gap-3" : "gap-4"}`}>
      {items.map((item, index) => (
        <div key={item} className="grid grid-cols-[2.15rem_1fr] items-start gap-3">
          <span
            className={`grid aspect-square place-items-center rounded-full text-[0.68rem] font-black leading-none ${
              dark ? "bg-white/16 text-white" : "bg-white text-[#142836] shadow-sm"
            }`}
            style={dark ? undefined : { border: `2px solid ${theme.colors.accent}` }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <p
            className={`${compact ? "text-[0.84rem] leading-5" : "text-sm leading-6"} font-semibold ${
              dark ? "text-white/86" : "text-slate-700"
            }`}
          >
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProofBand({
  items,
  cta,
  ctaDetail,
  theme,
  dark = false,
}: {
  items: string[];
  cta: string;
  ctaDetail?: string;
  theme: ReturnType<typeof getBrandTheme>;
  dark?: boolean;
}) {
  const detail = safeCtaDetail(cta, ctaDetail);

  return (
    <div className={`grid gap-4 ${dark ? "text-white" : "text-[#142836]"}`}>
      <div className={`h-px w-full ${dark ? "bg-white/28" : "bg-slate-300/80"}`} />
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item, index) => (
            <div key={item} className="grid gap-2">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-[0.68rem] font-black leading-none ${
                  dark ? "bg-white/16 text-white" : "bg-white text-[#142836] shadow-sm"
                }`}
                style={dark ? undefined : { border: `2px solid ${theme.colors.accent}` }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className={`m-0 text-sm font-semibold leading-6 ${dark ? "text-white/86" : "text-slate-700"}`}>{item}</p>
            </div>
          ))}
        </div>
        <span
          className={`w-fit rounded-full px-5 py-3 text-sm font-black shadow-sm ${
            dark ? "bg-white text-[#142836]" : "text-white"
          }`}
          style={dark ? undefined : { backgroundColor: theme.colors.primary }}
        >
          {cta}
        </span>
        {detail ? <p className={`text-xs font-semibold leading-5 ${dark ? "text-white/66" : "text-slate-500"}`}>{detail}</p> : null}
      </div>
    </div>
  );
}

function FlyerSubpointBand({
  items,
  cta,
  ctaDetail,
  theme,
}: {
  items: string[];
  cta: string;
  ctaDetail?: string;
  theme: ReturnType<typeof getBrandTheme>;
}) {
  const detail = safeCtaDetail(cta, ctaDetail);

  return (
    <div className="grid gap-5 border-t border-slate-300/80 pt-5">
      <div className="grid gap-3">
        {items.slice(0, 2).map((item) => (
          <p key={item} className="relative m-0 max-w-[27rem] pl-5 text-[0.96rem] font-extrabold leading-6 text-[#26384A]">
            <span className="absolute left-0 top-[0.38rem] h-[0.72rem] w-[0.72rem] rounded-full" style={{ backgroundColor: theme.colors.accent }} />
            {item}
          </p>
        ))}
      </div>
      <span
        className="w-fit rounded-full px-5 py-3 text-sm font-black text-white shadow-sm"
        style={{ backgroundColor: theme.colors.primary }}
      >
        {cta}
      </span>
      {detail ? <p className="text-xs font-semibold leading-5 text-slate-500">{detail}</p> : null}
    </div>
  );
}

function CampaignFlyer({
  artifact,
  copy,
  logoUrl,
}: {
  artifact: GeneratedArtifact;
  copy: FittedCopy;
  logoUrl?: string;
}) {
  const theme = getBrandTheme(artifact.brand);
  const visual = artifact.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  const audienceLabel = getArtifactAudienceLabel(artifact);
  const hasVisual = Boolean(visual);

  return (
    <article className="relative mx-auto aspect-[4/5] w-full max-w-[780px] overflow-hidden rounded-md bg-white shadow-sm">
      <div className="absolute inset-0 overflow-hidden">
        {artPlate(visual, `${artifact.brand} art plate`, "scale-105", "opacity-90")}
        <div
          className={
            hasVisual
              ? "absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,.98)_34%,rgba(255,255,255,.78)_53%,rgba(255,255,255,.22)_74%,rgba(255,255,255,0)_100%)]"
              : "absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,.96)_46%,rgba(255,255,255,.72)_72%,rgba(255,255,255,.42)_100%)]"
          }
        />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white/82 to-transparent" />
      </div>
      <div className="relative z-10 grid h-full max-w-[78%] content-start gap-7 p-8 sm:p-10">
        <Logo brandName={artifact.brand} logoUrl={logoUrl} />
        <div className="grid gap-4">
          {audienceLabel ? (
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: theme.colors.primary }}>
              For {audienceLabel}
            </p>
          ) : null}
          <CampaignHeadline headline={copy.headline} className="text-[2.75rem] font-black leading-[0.96] text-[#142836] sm:text-5xl" />
          <p className="max-w-md text-lg font-semibold leading-8 text-slate-700">{copy.deck}</p>
        </div>
        <FlyerSubpointBand items={copy.proofPoints} cta={copy.cta} ctaDetail={copy.ctaDetail} theme={theme} />
      </div>
      <div className="absolute bottom-0 right-0 h-3 w-2/3" style={{ background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.accent})` }} />
    </article>
  );
}

function MagazineOnePager({ artifact, copy, logoUrl }: { artifact: GeneratedArtifact; copy: FittedCopy; logoUrl?: string }) {
  const theme = getBrandTheme(artifact.brand);
  const visual = artifact.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  const audienceLabel = getArtifactAudienceLabel(artifact);

  return (
    <article className="mx-auto grid min-h-[920px] w-full max-w-[820px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-md bg-[#fbfaf7] shadow-sm">
      <section className="grid grid-cols-[1.08fr_.92fr] gap-7 p-9 pb-7">
        <div className="grid content-start gap-8">
          <Logo brandName={artifact.brand} logoUrl={logoUrl} />
          <div className="grid gap-4">
            {audienceLabel ? (
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: theme.colors.primary }}>
                {audienceLabel}
              </p>
            ) : null}
            <h1 className="text-[3.25rem] font-black leading-[0.92] text-[#142836]">{copy.headline}</h1>
            <p className="max-w-md text-lg font-medium leading-8 text-slate-700">{copy.deck}</p>
          </div>
        </div>
        <div className="relative min-h-[470px] overflow-hidden rounded-bl-[5rem]" style={{ backgroundColor: theme.colors.soft }}>
        {artPlate(visual, `${artifact.brand} art plate`, "scale-105")}
        <div className="absolute inset-0 bg-gradient-to-t from-[#142836]/28 via-transparent to-white/15" />
        </div>
      </section>
      <section className="px-9 pb-9">
        <ProofBand items={copy.proofPoints} cta={copy.cta} ctaDetail={copy.ctaDetail} theme={theme} />
      </section>
      <div className="h-4 w-full" style={{ background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.accent})` }} />
    </article>
  );
}

function ExecutiveBrief({ artifact, copy, logoUrl }: { artifact: GeneratedArtifact; copy: FittedCopy; logoUrl?: string }) {
  const theme = getBrandTheme(artifact.brand);
  const visual = artifact.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  const audienceLabel = getArtifactAudienceLabel(artifact);

  return (
    <article className="mx-auto grid min-h-[880px] w-full max-w-[800px] grid-cols-[.72fr_1.28fr] overflow-hidden rounded-md bg-white shadow-sm">
      <aside className="relative overflow-hidden">
        {artPlate(visual, `${artifact.brand} art plate`, "scale-105")}
        <div className="absolute inset-0 bg-gradient-to-b from-[#142836]/12 to-[#142836]/50" />
      </aside>
      <section className="grid content-between p-10">
        <div className="grid gap-7">
          <Logo brandName={artifact.brand} logoUrl={logoUrl} />
          <div className="grid gap-3">
            {audienceLabel ? (
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: theme.colors.primary }}>
                Executive brief for {audienceLabel}
              </p>
            ) : null}
            <h1 className="text-5xl font-black leading-[.96] text-[#142836]">{copy.headline}</h1>
            <p className="text-lg font-medium leading-8 text-slate-700">{copy.deck}</p>
          </div>
          <div className="grid gap-3 border-l-4 py-1 pl-5" style={{ borderColor: theme.colors.accent }}>
            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: theme.colors.primary }}>
              Priority signals
            </p>
            <ProofCluster items={copy.proofPoints} theme={theme} compact />
          </div>
        </div>
        <div className="flex items-center justify-between gap-5 border-t border-slate-300 pt-5">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{artifact.brand}</span>
          <div className="grid justify-items-end gap-1">
            <span className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: theme.colors.primary }}>
            {copy.cta}
          </span>
            {safeCtaDetail(copy.cta, copy.ctaDetail) ? <span className="text-xs font-semibold text-slate-500">{safeCtaDetail(copy.cta, copy.ctaDetail)}</span> : null}
          </div>
        </div>
      </section>
    </article>
  );
}

function SocialAnnouncement({ artifact, copy, logoUrl }: { artifact: GeneratedArtifact; copy: FittedCopy; logoUrl?: string }) {
  const theme = getBrandTheme(artifact.brand);
  const visual = artifact.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  const audienceLabel = getArtifactAudienceLabel(artifact);

  return (
    <article className="relative mx-auto aspect-square w-full max-w-[680px] overflow-hidden rounded-md bg-[#142836] p-9 text-white shadow-sm">
      {artPlate(visual, `${artifact.brand} art plate`, "opacity-82")}
      <div className="absolute inset-0 bg-gradient-to-br from-[#142836]/90 via-[#142836]/58 to-transparent" />
      <div className="relative z-10 grid h-full content-between">
        <Logo brandName={artifact.brand} logoUrl={logoUrl} dark />
        <div className="grid max-w-[88%] gap-4">
          {audienceLabel ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/72">{audienceLabel}</p> : null}
          <h1 className="text-5xl font-black leading-[0.92]">{copy.headline}</h1>
          <p className="max-w-md text-base font-medium leading-7 text-white/82">{copy.deck}</p>
          <span className="mt-2 w-fit rounded-full px-5 py-3 text-sm font-bold text-[#142836]" style={{ backgroundColor: theme.colors.accent }}>
            {copy.cta}
          </span>
          {safeCtaDetail(copy.cta, copy.ctaDetail) ? <p className="text-xs font-semibold leading-5 text-white/68">{safeCtaDetail(copy.cta, copy.ctaDetail)}</p> : null}
        </div>
      </div>
    </article>
  );
}

function EmailHero({ artifact, copy, logoUrl }: { artifact: GeneratedArtifact; copy: FittedCopy; logoUrl?: string }) {
  const theme = getBrandTheme(artifact.brand);
  const visual = artifact.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  const audienceLabel = getArtifactAudienceLabel(artifact);

  return (
    <article className="mx-auto max-w-[680px] overflow-hidden rounded-md bg-white shadow-sm">
      <header className="px-8 py-6" style={{ backgroundColor: theme.colors.soft }}>
        <Logo brandName={artifact.brand} logoUrl={logoUrl} />
      </header>
      <section className="relative h-56 overflow-hidden">
        {artPlate(visual, `${artifact.brand} art plate`, "scale-105")}
        <div className="absolute inset-0 bg-gradient-to-r from-[#142836]/72 to-transparent" />
        <div className="relative z-10 grid h-full content-end p-8 text-white">
          {audienceLabel ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/76">For {audienceLabel}</p> : null}
          <h1 className="mt-2 max-w-lg text-4xl font-black leading-[.98]">{copy.headline}</h1>
        </div>
      </section>
      <section className="grid gap-5 px-8 py-7">
        <p className="text-base font-medium leading-7 text-slate-700">{copy.deck}</p>
        <ProofCluster items={copy.proofPoints} theme={theme} compact />
        <span className="w-fit rounded-md px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: theme.colors.primary }}>
          {copy.cta}
        </span>
        {safeCtaDetail(copy.cta, copy.ctaDetail) ? <p className="text-xs font-semibold leading-5 text-slate-500">{safeCtaDetail(copy.cta, copy.ctaDetail)}</p> : null}
      </section>
    </article>
  );
}

function renderTemplate(template: CompositionTemplate, artifact: GeneratedArtifact, copy: FittedCopy, logoUrl?: string) {
  if (template.id === "magazine-one-pager") return <MagazineOnePager artifact={artifact} copy={copy} logoUrl={logoUrl} />;
  if (template.id === "executive-brief") return <ExecutiveBrief artifact={artifact} copy={copy} logoUrl={logoUrl} />;
  if (template.id === "social-announcement") return <SocialAnnouncement artifact={artifact} copy={copy} logoUrl={logoUrl} />;
  if (template.id === "email-hero") return <EmailHero artifact={artifact} copy={copy} logoUrl={logoUrl} />;
  return <CampaignFlyer artifact={artifact} copy={copy} logoUrl={logoUrl} />;
}

export function ComposedArtifactPreview({ artifact, logoUrl }: ComposedArtifactPreviewProps) {
  const copy = artifact.fittedCopy ?? fallbackCopy(artifact);
  const template = artifact.compositionTemplate ?? resolveCompositionTemplate(artifact.artifactType);

  return (
    <ArtifactPreviewFrame
      title={copy.headline}
      eyebrow={`${artifact.brand} ${template.id.replace(/-/g, " ")}`}
      note="App-composed layout with ImageGen art plate"
      accent={template.id === "campaign-flyer" ? "amber" : template.id === "magazine-one-pager" ? "green" : "teal"}
      footer={copy.footer ? <p className="text-xs text-slate-500">{copy.footer}</p> : null}
    >
      {renderTemplate(template, artifact, copy, logoUrl)}
    </ArtifactPreviewFrame>
  );
}
