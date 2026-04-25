import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { getBrandLogoPublicPathForArtifact } from "@/lib/brands/brandAssets";
import { logoNeedsContrastPlate } from "@/lib/brands/logoContrast";
import { getArtifactAudienceLabel } from "@/lib/review/textEdits";

function js(value: string) {
  return JSON.stringify(value);
}

function jsxText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function headlinePhrases(headline: string) {
  const parts = headline
    .split(",")
    .map((part, index, all) => `${part.trim()}${index < all.length - 1 ? "," : ""}`)
    .filter(Boolean);

  return parts.length >= 2 && parts.length <= 4 ? parts : [headline];
}

function headlineJsx(headline: string) {
  const parts = headlinePhrases(headline);
  if (parts.length === 1) return jsxText(headline);
  return parts.map((part) => `<span className="block whitespace-nowrap">${jsxText(part)}</span>`).join("");
}

export function exportReactSection(artifact: GeneratedArtifact) {
  const fitted = artifact.fittedCopy;
  const headline = fitted?.headline ?? artifact.copy.headlineOptions[0];
  const deck = fitted?.deck ?? artifact.copy.subheadOptions[0];
  const cta = fitted?.cta ?? artifact.copy.cta;
  const ctaDetail = fitted?.ctaDetail;
  const bullets = (fitted?.proofPoints ?? artifact.copy.bullets.slice(0, 3)).map((bullet) => `    ${js(bullet)},`).join("\n");
  const visual = artifact.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  const logoVariantId = (artifact.request as { logoVariant?: string } | undefined)?.logoVariant;
  const logoUrl = getBrandLogoPublicPathForArtifact(artifact.brand, artifact.artifactType, logoVariantId);
  const templateId = artifact.compositionTemplate?.id ?? "campaign-flyer";
  const designRecipeId = artifact.designRecipe?.id ?? "studio";
  const isCampaignFlyer = templateId === "campaign-flyer";
  const audienceLabel = getArtifactAudienceLabel(artifact);
  const logoClassName =
    logoNeedsContrastPlate(logoUrl) && !isCampaignFlyer
      ? "inline-block max-h-[88px] max-w-[244px] rounded-md bg-white/95 px-3 py-2 object-contain shadow-sm"
      : "max-h-12 max-w-60 object-contain";
  const proofMarkup =
    templateId === "social-announcement"
      ? ""
      : templateId === "campaign-flyer"
        ? `<ul className="grid gap-3 border-t border-slate-300/80 pt-5">
          {bullets.slice(0, 2).map((bullet) => (
            <li key={bullet} className="relative max-w-[27rem] pl-5 text-[0.96rem] font-extrabold leading-6 text-[#26384A] before:absolute before:left-0 before:top-[0.38rem] before:h-[0.72rem] before:w-[0.72rem] before:rounded-full before:bg-[#F7D470]">
              {bullet}
            </li>
          ))}
            </ul>`
        : `<ul className="grid gap-3 border-t border-white/25 pt-4">
          {bullets.map((bullet, index) => (
            <li key={bullet} className="grid grid-cols-[2.15rem_1fr] items-start gap-3 text-white/88">
              <span className="grid aspect-square place-items-center rounded-full bg-white/16 text-[0.68rem] font-black leading-none text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="m-0 text-sm font-bold leading-6">
                {bullet}
              </p>
            </li>
          ))}
            </ul>`;

  return `export function ${artifact.brand.replace(/[^a-zA-Z0-9]/g, "")}ArtifactSection() {
  const bullets = [
${bullets}
  ];
  const visualUrl = ${js(visual ?? "")};
  const logoUrl = ${js(logoUrl)};

  return (
    <section className="bg-[#f7f4ee] px-6 py-12 text-[#20252A]" data-template="${templateId}">
      <div data-design-recipe="${designRecipeId}" className="${isCampaignFlyer ? "relative mx-auto aspect-[4/5] w-full max-w-[780px] overflow-hidden rounded-lg bg-white text-[#142836]" : "relative mx-auto min-h-[720px] max-w-5xl overflow-hidden rounded-lg bg-[#142836] text-white"}">
        {visualUrl ? <img src={visualUrl} alt="${headline} art plate" className="absolute inset-0 h-full w-full object-cover ${isCampaignFlyer ? "scale-105 opacity-90" : "opacity-70"}" /> : null}
        <div className="${isCampaignFlyer ? "absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,.98)_66%,rgba(255,255,255,.9)_76%,rgba(255,255,255,0)_92%)]" : "absolute inset-0 bg-gradient-to-r from-[#142836]/95 via-[#142836]/64 to-transparent"}" />
        <div className="${isCampaignFlyer ? "absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white/82 to-transparent" : "hidden"}" />
        <div className="${isCampaignFlyer ? "relative z-10 grid h-full max-w-[68%] content-start gap-7 p-8 sm:p-10" : "relative z-10 grid min-h-[720px] max-w-2xl content-between p-10"}">
          <div className="grid gap-8">
            {logoUrl ? <img src={logoUrl} alt="${artifact.brand} logo" className="${logoClassName}" /> : <p className="${isCampaignFlyer ? "text-xs font-bold uppercase tracking-[0.18em] text-[#0081A4]" : "text-sm font-semibold uppercase tracking-wide text-cyan-200"}">${artifact.brand}</p>}
            <div className="grid gap-4">
              ${audienceLabel ? `<p className="${isCampaignFlyer ? "text-xs font-bold uppercase tracking-[0.18em] text-[#0081A4]" : "text-xs font-bold uppercase tracking-[0.18em] text-cyan-100"}">For ${audienceLabel}</p>` : ""}
              <h1 className="${isCampaignFlyer ? "text-[2.75rem] font-black leading-[.96] text-[#142836] sm:text-5xl" : "text-5xl font-black leading-[.95]"}">${headlineJsx(headline)}</h1>
              <p className="${isCampaignFlyer ? "max-w-md text-lg font-semibold leading-8 text-slate-700" : "text-lg font-semibold leading-8 text-white/82"}">${deck}</p>
            </div>
          </div>
          <div className="grid gap-5">
            ${proofMarkup}
            <a className="w-fit rounded-full bg-[#0081A4] px-5 py-3 text-sm font-bold text-white shadow-sm" href="/contact">${cta}</a>
            ${ctaDetail ? `<p className="text-xs font-semibold leading-5 text-slate-500">${ctaDetail}</p>` : ""}
          </div>
        </div>
        ${isCampaignFlyer ? '<div className="absolute bottom-0 right-0 h-3 w-2/3 bg-gradient-to-r from-[#0081A4] via-[#5EA974] to-[#F7D470]" />' : ""}
      </div>
    </section>
  );
}
`;
}
