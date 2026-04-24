import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { getBrandLogoPublicPathForArtifact } from "@/lib/brands/brandAssets";
import { getBrandTheme } from "@/lib/brands/brandThemes";
import { isEmailArtifact } from "@/lib/artifacts/artifactOptions";
import { resolveCompositionTemplate } from "@/lib/composition";
import { getArtifactAudienceLabel } from "@/lib/review/textEdits";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function proofList(items: string[]) {
  return items
    .map((item, index) => `<li class="proof-item"><span>${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(item)}</p></li>`)
    .join("");
}

function flyerSubpoints(items: string[]) {
  return items
    .slice(0, 2)
    .map((item) => `<li class="flyer-subpoint">${escapeHtml(item)}</li>`)
    .join("");
}

function headlinePhrases(headline: string) {
  const parts = headline
    .split(",")
    .map((part, index, all) => `${part.trim()}${index < all.length - 1 ? "," : ""}`)
    .filter(Boolean);

  return parts.length >= 2 && parts.length <= 4 ? parts : [headline];
}

function headlineHtml(headline: string) {
  const parts = headlinePhrases(headline);
  return parts.map((part) => `<span${parts.length > 1 ? ' class="headline-line"' : ""}>${escapeHtml(part)}</span>`).join("");
}

function emailRows(items: string[]) {
  return items
    .slice(0, 4)
    .map(
      (item, index) => `<tr><td style="padding:10px 0;font:14px/1.55 Montserrat,Arial,sans-serif;color:#334155;"><span style="display:inline-block;width:28px;height:28px;border-radius:999px;background:${index === 0 ? "#f6c744" : "#eef2f7"};text-align:center;font:800 10px/28px Montserrat,Arial,sans-serif;color:#142836;margin-right:10px;">${String(index + 1).padStart(2, "0")}</span>${escapeHtml(item)}</td></tr>`,
    )
    .join("");
}

function exportEmailHtml(artifact: GeneratedArtifact, logoUrl: string, visual: string | undefined) {
  const fitted = artifact.fittedCopy;
  const title = fitted?.headline ?? artifact.copy.headlineOptions[0] ?? artifact.brand;
  const subtitle = fitted?.deck ?? artifact.copy.subheadOptions[0] ?? artifact.brief.objective;
  const proofPoints = fitted?.proofPoints ?? artifact.copy.bullets;
  const cta = fitted?.cta ?? artifact.copy.cta;
  const ctaDetail = fitted?.ctaDetail;
  const theme = getBrandTheme(artifact.brand);
  const isHeader = artifact.artifactType === "email-header";
  const audienceLabel = getArtifactAudienceLabel(artifact);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:${theme.colors.soft};padding:24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${theme.colors.soft};">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:680px;max-width:100%;border-collapse:collapse;background:${theme.colors.surface};border:1px solid #d9dee4;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 18px;background:${theme.colors.soft};">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(artifact.brand)} logo" style="display:block;max-width:240px;max-height:72px;width:auto;height:auto;" />` : `<p style="margin:0;font:700 12px/1.4 Montserrat,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${theme.colors.primary};">${escapeHtml(artifact.brand)}</p>`}
            </td>
          </tr>
          ${
            visual
              ? `<tr><td><img src="${visual}" alt="${escapeHtml(artifact.brand)} visual" style="display:block;width:100%;height:auto;border:0;" /></td></tr>`
              : `<tr><td style="height:180px;background:linear-gradient(135deg,${theme.colors.primary},${theme.colors.secondary} 55%,${theme.colors.accent});"></td></tr>`
          }
          <tr>
            <td style="padding:30px 32px 34px;">
              ${audienceLabel ? `<p style="margin:0 0 10px;font:700 11px/1.4 Montserrat,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">For ${escapeHtml(audienceLabel)}</p>` : ""}
              <h1 style="margin:0 0 14px;font:700 32px/1.12 Montserrat,Arial,sans-serif;color:${theme.colors.ink};">${escapeHtml(title)}</h1>
              <p style="margin:0 0 18px;font:16px/1.65 Montserrat,Arial,sans-serif;color:#475569;">${escapeHtml(subtitle)}</p>
              ${
                !isHeader && proofPoints.length
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 0;margin:0 0 20px;">${emailRows(proofPoints)}</table>`
                  : ""
              }
              <a href="#" style="display:inline-block;border-radius:8px;background:${theme.colors.primary};color:#ffffff;padding:13px 18px;font:700 14px/1 Montserrat,Arial,sans-serif;text-decoration:none;">${escapeHtml(cta)}</a>
              ${ctaDetail ? `<p style="margin:12px 0 0;font:12px/1.5 Montserrat,Arial,sans-serif;color:#64748b;">${escapeHtml(ctaDetail)}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;border-top:1px solid #e2e8f0;font:12px/1.5 Montserrat,Arial,sans-serif;color:#64748b;">${escapeHtml(artifact.copy.footer ?? "Generated for internal WCEPS review.")}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function exportHtml(artifact: GeneratedArtifact) {
  const fitted = artifact.fittedCopy;
  const title = fitted?.headline ?? artifact.copy.headlineOptions[0] ?? artifact.brand;
  const subtitle = fitted?.deck ?? artifact.copy.subheadOptions[0] ?? artifact.brief.objective;
  const proofPoints = fitted?.proofPoints ?? artifact.copy.bullets.slice(0, 3);
  const cta = fitted?.cta ?? artifact.copy.cta;
  const ctaDetail = fitted?.ctaDetail;
  const visual = artifact.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  const logoVariantId = (artifact.request as { logoVariant?: string } | undefined)?.logoVariant;
  const logoUrl = getBrandLogoPublicPathForArtifact(artifact.brand, artifact.artifactType, logoVariantId);
  const theme = getBrandTheme(artifact.brand);
  const template = artifact.compositionTemplate ?? resolveCompositionTemplate(artifact.artifactType);
  const designRecipeId = artifact.designRecipe?.id ?? "studio";
  const showProofs = template.id !== "social-announcement";
  const isFlyer = template.id === "campaign-flyer";
  const audienceLabel = getArtifactAudienceLabel(artifact);

  if (isEmailArtifact(artifact.artifactType)) {
    return exportEmailHtml(artifact, logoUrl, visual);
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --navy: #142836; --blue: ${theme.colors.primary}; --teal: ${theme.colors.secondary}; --green: #5EA974; --paper: ${theme.colors.soft}; --ink: ${theme.colors.ink}; --accent: ${theme.colors.accent}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font-family: Montserrat, Arial, sans-serif; letter-spacing: 0; }
    main { max-width: 960px; margin: 0 auto; padding: 48px 24px; }
    .artifact { position: relative; min-height: 760px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 18px 50px rgba(20,40,54,.12); }
    .artifact.social-announcement { max-width: 720px; min-height: 720px; aspect-ratio: 1 / 1; }
    .artifact.email-hero { max-width: 680px; min-height: auto; }
    .hero { position: relative; min-height: 420px; background: var(--navy); color: white; overflow: hidden; }
    .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .72; }
    .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(20,40,54,.9), rgba(20,40,54,.48), rgba(20,40,54,.06)); }
    .campaign-flyer .hero::after { background: linear-gradient(90deg, #fff 0%, rgba(255,255,255,.98) 34%, rgba(255,255,255,.78) 53%, rgba(255,255,255,.22) 74%, rgba(255,255,255,0) 100%); }
    .hero-inner { position: relative; z-index: 1; display: grid; align-content: space-between; gap: 40px; min-height: 760px; padding: 52px; max-width: 680px; }
    .campaign-flyer .hero-inner { align-content: start; gap: 28px; max-width: 78%; color: var(--ink); padding: 44px; }
    .eyebrow { margin: 0 0 12px; color: #b7edf1; font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .campaign-flyer .eyebrow { color: var(--blue); }
    h1 { margin: 0; max-width: 680px; font-size: 58px; line-height: .95; font-weight: 900; }
    .campaign-flyer h1 { color: #142836; font-size: 48px; line-height: .96; }
    .headline-line { display: block; white-space: nowrap; }
    .subtitle { max-width: 600px; margin: 18px 0 0; font-size: 20px; line-height: 1.55; color: #e7f2f4; font-weight: 600; }
    .campaign-flyer .subtitle { color: #475569; font-weight: 650; }
    .brand-logo { display: block; max-width: 220px; max-height: 64px; object-fit: contain; }
    .proofs { display: grid; gap: 12px; list-style: none; margin: 0 0 18px; padding: 18px 0 0; max-width: 620px; border-top: 1px solid rgba(255,255,255,.35); }
    .proof-item { display: grid; grid-template-columns: 34px 1fr; gap: 12px; align-items: start; color: rgba(255,255,255,.88); }
    .proof-item span { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 999px; background: rgba(255,255,255,.16); color: white; font-size: 11px; font-weight: 900; }
    .proof-item p { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.5; }
    .flyer-subpoints { display: grid; gap: 12px; list-style: none; margin: 0 0 18px; padding: 18px 0 0; max-width: 430px; border-top: 1px solid rgba(148,163,184,.65); }
    .flyer-subpoint { position: relative; padding-left: 20px; color: #26384A; font-size: 15px; font-weight: 850; line-height: 1.55; }
    .flyer-subpoint::before { content: ""; position: absolute; left: 0; top: 7px; width: 11px; height: 11px; border-radius: 999px; background: var(--accent); }
    .cta { display: inline-block; width: fit-content; border-radius: 999px; background: var(--blue); color: white; padding: 12px 18px; font-weight: 700; }
    .cta-detail { margin: 10px 0 0; color: #64748b; font-size: 12px; font-weight: 650; }
    .footer { padding: 18px 44px; color: #667085; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <article class="artifact ${template.id}" data-design-recipe="${escapeHtml(designRecipeId)}">
      <section class="hero">
        ${visual ? `<img class="hero-img" src="${visual}" alt="${escapeHtml(artifact.brand)} generated visual" />` : ""}
        <div class="hero-inner">
          <div>
            ${logoUrl ? `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(artifact.brand)} logo" />` : `<p class="eyebrow">${escapeHtml(artifact.brand)}</p>`}
          </div>
          <div>
            ${audienceLabel ? `<p class="eyebrow">For ${escapeHtml(audienceLabel)}</p>` : ""}
            <h1>${headlineHtml(title)}</h1>
            <p class="subtitle">${escapeHtml(subtitle)}</p>
          </div>
          <div>
            ${
              showProofs
                ? isFlyer
                  ? `<ul class="flyer-subpoints">${flyerSubpoints(proofPoints)}</ul>`
                  : `<ul class="proofs">${proofList(proofPoints)}</ul>`
                : ""
            }
            <a class="cta" href="#">${escapeHtml(cta)}</a>
            ${ctaDetail ? `<p class="cta-detail">${escapeHtml(ctaDetail)}</p>` : ""}
          </div>
        </div>
      </section>
      <footer class="footer">${escapeHtml(artifact.copy.footer ?? "Generated for internal WCEPS review.")}</footer>
    </article>
  </main>
</body>
</html>`;
}
