"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { artifactTypeOptions } from "@/lib/artifacts/artifactOptions";
import { starterExamples, getStarterExample, type StarterExample } from "@/lib/examples/starterExamples";
import { resolveArtifactFormat } from "@/lib/generation/artifactFormat";
import type { ContextAttachment } from "@/lib/schema/artifactRequest";
import { RequestSelect, RequestTextarea } from "./index";

type ImageConfig = {
  configured: boolean;
  model: string;
  responsesModel: string;
  copyFitModel: string;
  copyFitEnabled: boolean;
  designRecipeModel: string;
  designRecipeEnabled: boolean;
  size: string;
  quality: string;
  outputFormat: string;
};

type ArtifactRequestFormProps = {
  imageConfig?: ImageConfig;
};

type FormState = {
  artifactType: string;
  brand: string;
  audience: string;
  keyMessage: string;
  cta: string;
  visualInstruction: string;
  contextAttachments: ContextAttachment[];
};

type RecentDraft = {
  id: string;
  title: string;
  brand: string;
  artifactType: string;
  status: string;
  updatedAt: string;
};

const maxAttachmentBytes = 3 * 1024 * 1024;

function formStateFromExample(example: StarterExample): FormState {
  return {
    artifactType: example.artifactType,
    brand: example.brand,
    audience: example.audience,
    keyMessage: example.keyMessage,
    cta: example.cta,
    visualInstruction: example.visualInstruction ?? "",
    contextAttachments: [],
  };
}

const initialState = formStateFromExample(starterExamples[0]);

function artifactLabel(value: string) {
  return artifactTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function readAttachment(file: File): Promise<ContextAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read attachment."));
        return;
      }
      resolve({ name: file.name, type: file.type || "application/octet-stream", dataUrl: reader.result });
    };
    reader.onerror = () => reject(new Error("Unable to read attachment."));
    reader.readAsDataURL(file);
  });
}

function textFromRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readRecentDrafts(): RecentDraft[] {
  const drafts: RecentDraft[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("wceps:draft:")) continue;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
      const copy = (parsed.copy && typeof parsed.copy === "object" ? parsed.copy : {}) as Record<string, unknown>;
      const fittedCopy = (parsed.fittedCopy && typeof parsed.fittedCopy === "object" ? parsed.fittedCopy : {}) as Record<string, unknown>;
      const review = (parsed.review && typeof parsed.review === "object" ? parsed.review : {}) as Record<string, unknown>;
      const headlineOptions = Array.isArray(copy.headlineOptions) ? copy.headlineOptions : [];
      const id = textFromRecord(parsed, "id");
      if (!id) continue;

      drafts.push({
        id,
        title: textFromRecord(fittedCopy, "headline") || (typeof headlineOptions[0] === "string" ? headlineOptions[0] : "Untitled draft"),
        brand: textFromRecord(parsed, "brand"),
        artifactType: textFromRecord(parsed, "artifactType"),
        status: review.approved ? "approved" : textFromRecord(review, "status") || "draft",
        updatedAt: textFromRecord(parsed, "updatedAt") || textFromRecord(parsed, "createdAt"),
      });
    } catch {
      // Ignore malformed browser drafts so the create page stays usable.
    }
  }

  return drafts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 4);
}

function StarterExampleTray({
  selectedExampleId,
  onSelect,
}: {
  selectedExampleId: string;
  onSelect: (example: StarterExample) => void;
}) {
  return (
    <section id="examples" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-[#142836]">Start from a proven setup</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Use a starter, then adjust the four inputs before generating.</p>
      </div>
      <div className="grid gap-3">
        {starterExamples.map((example) => {
          const selected = example.id === selectedExampleId;
          return (
            <button
              key={example.id}
              type="button"
              onClick={() => onSelect(example)}
              className={`grid gap-2 rounded-md border p-3 text-left transition ${
                selected ? "border-[#0081A4] bg-[#EAF7F8]" : "border-slate-200 bg-white hover:border-[#0081A4]/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{example.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {example.brand} · {artifactLabel(example.artifactType)}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selected ? "bg-white text-[#006985]" : "bg-slate-100 text-slate-600"}`}>
                  {selected ? "Using" : "Use"}
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-600">{example.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RecentDraftsTray() {
  const [drafts, setDrafts] = useState<RecentDraft[]>([]);

  useEffect(() => {
    setDrafts(readRecentDrafts());
  }, []);

  if (!drafts.length) return null;

  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-[#142836]">Recent drafts</h2>
      <div className="grid gap-2">
        {drafts.map((draft) => (
          <Link key={draft.id} href={`/review/${draft.id}`} className="rounded-md border border-slate-200 p-3 text-sm hover:border-[#0081A4]/50">
            <span className="font-semibold text-slate-950">{draft.title}</span>
            <span className="mt-1 block text-xs uppercase tracking-wide text-slate-500">
              {draft.brand} · {artifactLabel(draft.artifactType)} · {draft.status}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ConfidenceCard() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">
      <h2 className="text-base font-semibold text-[#142836]">What the tool handles</h2>
      <ul className="mt-3 grid gap-2">
        <li>Source-grounded copy</li>
        <li>Official logo placement</li>
        <li>Brand-boundary checks</li>
        <li>ImageGen art plate</li>
        <li>Download-ready PNG, PDF, and HTML</li>
      </ul>
    </section>
  );
}

function SystemStatus({ imageConfig }: { imageConfig: ImageConfig }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <summary className="cursor-pointer font-semibold text-slate-900">System status</summary>
      <div className="mt-3 grid gap-3 text-xs text-slate-600">
        <p className={imageConfig.configured ? "text-emerald-700" : "text-amber-700"}>
          {imageConfig.configured ? "Image generation is configured." : "Image generation needs an OpenAI key."}
        </p>
        <dl className="grid grid-cols-2 gap-2">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Image model</dt>
            <dd className="mt-1 break-words">{imageConfig.model}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Driver</dt>
            <dd className="mt-1 break-words">{imageConfig.responsesModel}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Copy fit</dt>
            <dd className="mt-1 break-words">
              {imageConfig.copyFitEnabled ? imageConfig.copyFitModel : `${imageConfig.copyFitModel} off`}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Design recipe</dt>
            <dd className="mt-1 break-words">
              {imageConfig.designRecipeEnabled ? imageConfig.designRecipeModel : `${imageConfig.designRecipeModel} off`}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Size</dt>
            <dd className="mt-1">{imageConfig.size}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Quality</dt>
            <dd className="mt-1">{imageConfig.quality}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-500">Format</dt>
            <dd className="mt-1">{imageConfig.outputFormat}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

export function ArtifactRequestForm({ imageConfig }: ArtifactRequestFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedQueryExample = useRef("");
  const [form, setForm] = useState<FormState>(initialState);
  const [selectedExampleId, setSelectedExampleId] = useState<string>(starterExamples[0].id);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyExample(example: StarterExample) {
    setForm(formStateFromExample(example));
    setSelectedExampleId(example.id);
    setError("");
  }

  useEffect(() => {
    const id = searchParams.get("example");
    if (!id || id === appliedQueryExample.current) return;
    const example = getStarterExample(id);
    if (!example) return;
    applyExample(example);
    appliedQueryExample.current = id;
  }, [searchParams]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSelectedExampleId("");
  }

  async function handleFiles(files: FileList | null) {
    setError("");
    if (!files?.length) {
      update("contextAttachments", []);
      return;
    }

    const selected = Array.from(files).slice(0, 2);
    const invalid = selected.find((file) => file.size > maxAttachmentBytes || (!file.type.startsWith("image/") && file.type !== "application/pdf"));
    if (invalid) {
      setError("Use a PDF or screenshot under 3 MB.");
      return;
    }

    try {
      const attachments = await Promise.all(selected.map(readAttachment));
      update("contextAttachments", attachments);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read attachment.");
    }
  }

  async function submit() {
    setError("");
    startTransition(async () => {
      try {
        const keyMessage = form.keyMessage.trim();
        const response = await fetch("/api/save-draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            artifactType: form.artifactType,
            brand: form.brand,
            audience: form.audience,
            keyMessage,
            goal: `Create a ${form.artifactType} that communicates: ${keyMessage}`,
            topic: keyMessage,
            cta: form.cta,
            format: resolveArtifactFormat(form.artifactType),
            toneModifier: "professional, warm, practical",
            notes: form.contextAttachments.length ? `Use attached context: ${form.contextAttachments.map((item) => item.name).join(", ")}.` : "",
            visualInstruction: form.visualInstruction,
            contextAttachments: form.contextAttachments,
            strictlySourceGrounded: true,
            generateVisual: true,
          }),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail.error ?? "Unable to generate draft.");
        }

        const result = (await response.json()) as {
          artifact?: unknown;
          reviewUrl: string;
          storage?: "server" | "client";
        };
        if (result.artifact && result.storage === "client") {
          const draft = result.artifact as { id?: string };
          if (draft.id) {
            window.localStorage.setItem(`wceps:draft:${draft.id}`, JSON.stringify(result.artifact));
          }
        }
        router.push(result.reviewUrl);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to generate draft.");
      }
    });
  }

  const selectedExample = selectedExampleId ? starterExamples.find((example) => example.id === selectedExampleId) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <RequestSelect
            label="Brand"
            htmlFor="brand"
            value={form.brand}
            onChange={(value) => update("brand", value)}
            options={[
              { label: "CARE Coaching", value: "CARE Coaching" },
              { label: "CCNA", value: "CCNA" },
              { label: "WebbAlign", value: "WebbAlign" },
              { label: "CALL", value: "CALL" },
              { label: "WIDA PRIME", value: "WIDA PRIME" },
              { label: "WCEPS parent brand", value: "WCEPS" },
            ]}
          />
          <RequestSelect
            label="Artifact type"
            htmlFor="artifact-type"
            value={form.artifactType}
            onChange={(value) => update("artifactType", value)}
            options={artifactTypeOptions}
          />
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-900" htmlFor="audience">
          Audience <span className="sr-only">required</span>
          <input
            id="audience"
            value={form.audience}
            onChange={(event) => update("audience", event.target.value)}
            required
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
        </label>

        <RequestTextarea
          label="Key message"
          htmlFor="key-message"
          rows={4}
          value={form.keyMessage}
          onChange={(value) => update("keyMessage", value)}
          required
        />

        <label className="grid gap-2 text-sm font-medium text-slate-900" htmlFor="cta">
          CTA
          <input
            id="cta"
            value={form.cta}
            onChange={(event) => update("cta", event.target.value)}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
        </label>

        <details className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Add PDF or screenshot context</summary>
          <div className="mt-3 grid gap-2">
            <input
              id="context"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF7F8] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#006985]"
            />
            {form.contextAttachments.length ? (
              <div className="flex flex-wrap gap-2">
                {form.contextAttachments.map((attachment) => (
                  <span key={`${attachment.name}-${attachment.type}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {attachment.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-slate-500">Optional. Use this when a prior artifact, screenshot, or PDF should guide the output.</p>
            )}
          </div>
        </details>

        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#0081A4] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#006985] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating..." : "Create artifact"}
          </button>
          {selectedExample ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Starter: {selectedExample.title}
            </span>
          ) : null}
        </div>
      </form>

      <aside className="grid content-start gap-4">
        <StarterExampleTray selectedExampleId={selectedExampleId} onSelect={applyExample} />
        <RecentDraftsTray />
        <ConfidenceCard />
        {imageConfig ? <SystemStatus imageConfig={imageConfig} /> : null}
      </aside>
    </div>
  );
}
