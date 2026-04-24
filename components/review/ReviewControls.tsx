"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getBrandLogoForArtifact, getBrandLogoVariants, LOGO_SOURCE_FOLDERS } from "@/lib/brands/brandAssets";
import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";

function requestRecord(artifact: GeneratedArtifact) {
  return artifact.request && typeof artifact.request === "object" ? (artifact.request as Record<string, unknown>) : {};
}

function supportLines(value: string, fallback: string[]) {
  const lines = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : fallback;
}

export function ReviewControls({ artifact }: { artifact: GeneratedArtifact }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const request = requestRecord(artifact);
  const [headline, setHeadline] = useState(artifact.copy.headlineOptions[0] ?? "");
  const [audience, setAudience] = useState(artifact.audience);
  const [cta, setCta] = useState(artifact.copy.cta);
  const [supportCopy, setSupportCopy] = useState(artifact.copy.bullets.join("\n"));
  const [visualInstruction, setVisualInstruction] = useState(typeof request.visualInstruction === "string" ? request.visualInstruction : "");
  const [logoVariant, setLogoVariant] = useState(typeof request.logoVariant === "string" ? request.logoVariant : "");
  const isBlocked = artifact.review.issues.length > 0;
  const logoVariants = getBrandLogoVariants(artifact.brand);
  const selectedLogo = getBrandLogoForArtifact(artifact.brand, artifact.artifactType, logoVariant);

  function approvedArtifact(): GeneratedArtifact {
    return {
      ...artifact,
      review: {
        ...artifact.review,
        approved: true,
        status: artifact.review.status === "block" ? "block" : artifact.review.status,
        approvedAt: new Date().toISOString(),
        reviewerName: "Internal reviewer",
      },
      updatedAt: new Date().toISOString(),
    };
  }

  function save(next: GeneratedArtifact, afterSave?: () => void) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/save-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });

      if (!response.ok) {
        setMessage("Unable to save review state.");
        return;
      }

      if (afterSave) {
        afterSave();
      } else {
        router.refresh();
      }
    });
  }

  function approveAndOpenExport() {
    if (isBlocked) return;
    save(artifact.review.approved ? artifact : approvedArtifact(), () => router.push(`/exports/${artifact.id}`));
  }

  function requestChanges() {
    save({
      ...artifact,
      review: {
        ...artifact.review,
        approved: false,
        status: artifact.review.status === "pass" ? "warn" : artifact.review.status,
        warnings: Array.from(new Set([...artifact.review.warnings, "Reviewer requested changes."])),
      },
      updatedAt: new Date().toISOString(),
    });
  }

  function regenerate() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/save-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(artifact.request ?? {}),
      });
      const result = (await response.json()) as { reviewUrl?: string; error?: string };
      if (!response.ok || !result.reviewUrl) {
        setMessage(result.error ?? "Unable to regenerate.");
        return;
      }
      router.push(result.reviewUrl);
    });
  }

  function saveEdits() {
    const bullets = supportLines(supportCopy, artifact.copy.bullets);
    save({
      ...artifact,
      audience: audience.trim() || artifact.audience,
      brief: {
        ...artifact.brief,
        audience: audience.trim() || artifact.brief.audience,
        cta: cta.trim() || artifact.brief.cta,
      },
      copy: {
        ...artifact.copy,
        headlineOptions: [headline.trim() || artifact.copy.headlineOptions[0], ...artifact.copy.headlineOptions.slice(1)],
        bullets,
        cta: cta.trim() || artifact.copy.cta,
      },
      review: {
        ...artifact.review,
        approved: false,
        approvedAt: undefined,
        reviewerName: undefined,
      },
      request: {
        ...request,
        audience: audience.trim() || artifact.audience,
        keyMessage: headline.trim() || artifact.copy.headlineOptions[0],
        cta: cta.trim() || artifact.copy.cta,
        visualInstruction: visualInstruction.trim(),
        logoVariant,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  function regenerateVisualOnly() {
    const prompt = artifact.imagePrompts[0] ?? "";
    const promptWithoutPriorRevision = prompt.replace(/\nUSER_VISUAL_REVISION=.*$/m, "");
    const revisedPrompt = visualInstruction.trim()
      ? `${promptWithoutPriorRevision}\nUSER_VISUAL_REVISION=${visualInstruction.trim().slice(0, 350)}`
      : promptWithoutPriorRevision;
    save({
      ...artifact,
      imagePrompts: [revisedPrompt, ...artifact.imagePrompts.slice(1)],
      imageResults: [],
      review: {
        ...artifact.review,
        approved: false,
        approvedAt: undefined,
        reviewerName: undefined,
      },
      request: {
        ...request,
        visualInstruction: visualInstruction.trim(),
        logoVariant,
        generateVisual: true,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 border-b border-slate-200 pb-4">
        <h2 className="text-base font-semibold text-slate-900">Edit before export</h2>
        <label className="grid gap-1 text-sm font-medium text-slate-900">
          Headline
          <textarea rows={2} value={headline} onChange={(event) => setHeadline(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-900">
          Audience
          <input value={audience} onChange={(event) => setAudience(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-900">
          CTA
          <input value={cta} onChange={(event) => setCta(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-900">
          Support copy
          <textarea rows={5} value={supportCopy} onChange={(event) => setSupportCopy(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-900">
          Visual instruction
          <textarea
            rows={3}
            value={visualInstruction}
            onChange={(event) => setVisualInstruction(event.target.value)}
            placeholder="Example: more executive, less classroom photo, use abstract pathway shapes"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-900">
          Logo variant
          <select value={logoVariant} onChange={(event) => setLogoVariant(event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
            {logoVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>
        {selectedLogo ? <p className="text-xs leading-5 text-slate-500">Using {selectedLogo.label} from {selectedLogo.originalFilename}</p> : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {LOGO_SOURCE_FOLDERS.map((folder) => (
            <a
              key={folder.id}
              href={folder.url}
              target="_blank"
              rel="noreferrer"
              className="w-fit text-xs font-semibold text-[#006985] underline decoration-teal-200 underline-offset-4 hover:text-[#004F63]"
            >
              {folder.label}
            </a>
          ))}
        </div>
        <div className="grid gap-2">
          <button type="button" onClick={saveEdits} className="rounded-md bg-[#0081A4] px-3 py-2 text-sm font-semibold text-white hover:bg-[#006985]">
            Save edits
          </button>
          <button type="button" onClick={regenerateVisualOnly} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Regenerate visual only
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Ready check</h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            isBlocked
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : artifact.review.approved
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {isBlocked ? "Blocked" : artifact.review.approved ? "Approved" : "Review"}
        </span>
      </div>

      {!isBlocked && !artifact.review.warnings.length ? (
        <p className="text-sm leading-6 text-slate-600">Claims check passed. Export when the artifact looks right.</p>
      ) : null}

      {artifact.review.issues.length ? (
        <ul className="grid gap-2 text-sm leading-6 text-rose-800">
          {artifact.review.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {!artifact.review.issues.length && artifact.review.warnings.length ? (
        <details className="text-sm text-amber-800">
          <summary className="cursor-pointer font-semibold">{artifact.review.warnings.length} warning(s)</summary>
          <ul className="mt-2 grid gap-2 leading-6">
            {artifact.review.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <button
        type="button"
        onClick={approveAndOpenExport}
        disabled={isBlocked || isPending}
        className={`rounded-md px-4 py-3 text-sm font-semibold ${
          isBlocked || isPending ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-[#0081A4] text-white hover:bg-[#006985]"
        }`}
      >
        {isBlocked ? "Resolve issues before export" : artifact.review.approved ? "Open export page" : "Approve and open export page"}
      </button>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={regenerate} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Regenerate
        </button>
        <button
          type="button"
          onClick={requestChanges}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Request changes
        </button>
      </div>
      {message ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p> : null}
      {isPending ? <p className="text-sm text-slate-500">Saving...</p> : null}
    </section>
  );
}
