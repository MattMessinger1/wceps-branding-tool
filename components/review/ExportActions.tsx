"use client";

import { useMemo, useState } from "react";
import { artifactExportBaseName, exportHtml, exportReactSection, isOfficialExportEnabled } from "@/lib/export";
import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";

type ExportActionsProps = {
  artifact: GeneratedArtifact;
  html?: string;
  react?: string;
  mode?: "primary" | "full";
};

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function copyBrief(artifact: GeneratedArtifact) {
  const fitted = artifact.fittedCopy;
  const headline = fitted?.headline ?? artifact.copy.headlineOptions[0];
  const deck = fitted?.deck ?? artifact.copy.subheadOptions[0];
  const points = fitted?.proofPoints ?? artifact.copy.bullets;
  const cta = fitted?.cta ?? artifact.copy.cta;

  return [
    headline,
    "",
    deck,
    "",
    ...points.map((bullet) => `- ${bullet}`),
    "",
    `CTA: ${cta}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function findExportNode(artifactId: string) {
  const scope = document.querySelector<HTMLElement>(`[data-artifact-export="${artifactId}"]`);
  return scope?.querySelector<HTMLElement>("article") ?? scope;
}

function htmlWithAbsoluteAssets(html: string) {
  return html.replace(/src="\/(brand-logos\/[^"]+)"/g, (_match, path: string) => `src="${window.location.origin}/${path}"`);
}

export function ExportActions({ artifact, html, react, mode = "full" }: ExportActionsProps) {
  const [message, setMessage] = useState("");
  const disabled = !isOfficialExportEnabled(artifact);
  const baseName = useMemo(() => artifactExportBaseName(artifact), [artifact]);
  const htmlExport = html ?? exportHtml(artifact);
  const reactExport = react ?? exportReactSection(artifact);
  const buttonClass =
    "rounded-md bg-[#0081A4] px-3 py-2 text-left text-sm font-semibold text-white hover:bg-[#006985] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500";
  const secondaryClass =
    "rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

  async function downloadPng() {
    if (disabled) return;
    setMessage(`Capturing artifact only as ${baseName}.png...`);
    const node = findExportNode(artifact.id);
    if (!node) {
      setMessage("Could not find the artifact canvas. Open the export page and try again.");
      return;
    }

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      downloadBlob(`${baseName}.png`, blob, "image/png");
      setMessage(`Downloaded ${baseName}.png to your browser downloads folder.`);
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "Unable to export PNG."} Try PDF or open the export page.`);
    }
  }

  async function downloadPdf() {
    if (disabled) return;
    setMessage(`Capturing artifact only as ${baseName}.pdf...`);
    const node = findExportNode(artifact.id);
    if (!node) {
      setMessage("Could not find the artifact canvas. Open the export page and try again.");
      return;
    }

    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const width = Math.ceil(node.getBoundingClientRect().width);
      const height = Math.ceil(node.getBoundingClientRect().height);
      const pdf = new jsPDF({
        orientation: width >= height ? "landscape" : "portrait",
        unit: "px",
        format: [width, height],
        hotfixes: ["px_scaling"],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`${baseName}.pdf`);
      setMessage(`Downloaded ${baseName}.pdf to your browser downloads folder.`);
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "Unable to export PDF."} Try PNG or open the export page.`);
    }
  }

  function downloadHtml() {
    if (disabled) return;
    downloadBlob(`${baseName}.html`, htmlWithAbsoluteAssets(htmlExport), "text/html;charset=utf-8");
    setMessage(`Downloaded ${baseName}.html to your browser downloads folder.`);
  }

  async function copyHtml() {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(htmlWithAbsoluteAssets(htmlExport));
      setMessage("HTML copied to clipboard.");
    } catch {
      setMessage("Unable to copy HTML. Use Download HTML instead.");
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{mode === "primary" ? "Ready to save" : "Export"}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {disabled ? "Approve this artifact before downloading official files." : `Captures the artifact canvas only. File: ${baseName}`}
        </p>
      </div>
      <div className="grid gap-2">
        <button className={buttonClass} type="button" onClick={downloadPng} disabled={disabled}>
          Download PNG
        </button>
        <button className={buttonClass} type="button" onClick={downloadPdf} disabled={disabled}>
          Download PDF
        </button>
        <button className={buttonClass} type="button" onClick={downloadHtml} disabled={disabled}>
          Download HTML
        </button>
        {mode === "full" ? (
          <button className={secondaryClass} type="button" onClick={copyHtml} disabled={disabled}>
            Copy HTML
          </button>
        ) : null}
      </div>
      {mode === "full" ? (
        <details className="rounded-md border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Advanced exports</summary>
          <div className="mt-3 grid gap-2">
            <button className={secondaryClass} type="button" onClick={() => downloadBlob(`${baseName}.tsx`, reactExport, "text/plain;charset=utf-8")} disabled={disabled}>
              React section
            </button>
            <button
              className={secondaryClass}
              type="button"
              onClick={() => downloadBlob(`${baseName}-prompt-pack.txt`, artifact.imagePrompts.join("\n\n---\n\n"), "text/plain;charset=utf-8")}
              disabled={disabled}
            >
              Prompt pack
            </button>
            <button className={secondaryClass} type="button" onClick={() => downloadBlob(`${baseName}-copy.txt`, copyBrief(artifact), "text/plain;charset=utf-8")} disabled={disabled}>
              Copy brief
            </button>
            <details className="rounded-md border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">Raw HTML</summary>
              <textarea readOnly className="mt-3 min-h-48 w-full rounded-md border border-slate-200 p-3 text-xs leading-5" value={htmlExport} />
            </details>
            <details className="rounded-md border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">React source</summary>
              <textarea readOnly className="mt-3 min-h-48 w-full rounded-md border border-slate-200 p-3 text-xs leading-5" value={reactExport} />
            </details>
          </div>
        </details>
      ) : null}
      {message ? <p className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600">{message}</p> : null}
    </section>
  );
}
