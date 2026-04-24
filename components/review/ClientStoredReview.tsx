"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArtifactRenderer } from "@/components/artifact/ArtifactRenderer";
import { ExportActions } from "@/components/review/ExportActions";
import { isEmailArtifact } from "@/lib/artifacts/artifactOptions";
import { getBrandLogoForArtifact, getBrandLogoVariants, LOGO_SOURCE_FOLDERS } from "@/lib/brands/brandAssets";
import { applyTextOnlyEdits, requestRecord, textEditStateFromArtifact, type TextEditState } from "@/lib/review/textEdits";
import type { GeneratedArtifact } from "@/lib/schema/generatedArtifact";
import { GeneratedArtifactSchema } from "@/lib/schema/generatedArtifact";

type VisualState = {
  status: "idle" | "starting" | "generating" | "complete" | "error";
  message: string;
  progress: number;
  detail?: string;
  jobId?: string;
  rawStatus?: string;
  elapsedSeconds?: number;
};

function storageKey(id: string) {
  return `wceps:draft:${id}`;
}

function imageJobStorageKey(id: string) {
  return `wceps:image-job:${id}`;
}

function wantsGeneratedVisual(artifact: GeneratedArtifact) {
  const request = artifact.request as { generateVisual?: unknown } | undefined;
  return Boolean(request?.generateVisual);
}

function hasGeneratedVisual(artifact: GeneratedArtifact) {
  return Boolean(artifact.imageResults?.some((image) => image.dataUrl));
}

function progressForPoll(status: string | undefined, attempts: number) {
  if (status === "queued") return Math.min(28, 16 + attempts * 2);
  if (status === "in_progress") return Math.min(98, 34 + attempts * 2);
  return Math.min(86, 22 + attempts * 2);
}

function visualStatusLabel(status: VisualState["status"], ready: boolean) {
  if (ready || status === "complete") return "ImageGen visual ready";
  if (status === "error") return "ImageGen visual needs attention";
  if (status === "starting") return "Preparing ImageGen visual";
  return "Generating ImageGen visual";
}

function imageSizeForArtifact(artifact: GeneratedArtifact) {
  if (artifact.artifactType === "social-graphic") {
    return "1024x1024";
  }

  if (isEmailArtifact(artifact.artifactType)) {
    return "1536x1024";
  }

  if (artifact.artifactType === "landing-page" || artifact.artifactType === "website") {
    return "1536x1024";
  }

  return "1024x1536";
}

function imageQualityForArtifact(artifact: GeneratedArtifact) {
  if (artifact.artifactType === "social-graphic") return "auto";
  return "auto";
}

function artifactProgressNoun(artifactType: string) {
  if (artifactType === "social-graphic") return "square social graphic";
  if (artifactType === "landing-page" || artifactType === "website") return "landscape web artifact";
  if (isEmailArtifact(artifactType)) return "email artifact";
  return "portrait artifact";
}

type StoredImageJob = {
  jobId: string;
  prompt: string;
  imageSize: string;
  startedAt: number;
};

const latestPipelineVersion = "campaign-art-plate-v5";

type AssetEditState = {
  visualInstruction: string;
  logoVariant: string;
};

function primaryHeadline(artifact: GeneratedArtifact) {
  return artifact.fittedCopy?.headline ?? artifact.copy.headlineOptions[0] ?? "";
}

function primaryCta(artifact: GeneratedArtifact) {
  return artifact.fittedCopy?.cta ?? artifact.copy.cta;
}

function assetEditStateFromArtifact(artifact: GeneratedArtifact): AssetEditState {
  const request = requestRecord(artifact);
  return {
    visualInstruction: typeof request.visualInstruction === "string" ? request.visualInstruction : "",
    logoVariant: typeof request.logoVariant === "string" ? request.logoVariant : "",
  };
}

function readStoredImageJob(id: string, prompt: string, imageSize: string) {
  try {
    const raw = window.localStorage.getItem(imageJobStorageKey(id));
    if (!raw) return null;
    const job = JSON.parse(raw) as StoredImageJob;
    const stillFresh = Date.now() - job.startedAt < 30 * 60 * 1000;
    if (job.prompt === prompt && job.imageSize === imageSize && stillFresh) return job;
  } catch {
    return null;
  }

  return null;
}

export function ClientStoredReview({ id, initialArtifact }: { id: string; initialArtifact?: GeneratedArtifact }) {
  const router = useRouter();
  const [artifact, setArtifact] = useState<GeneratedArtifact | null>(null);
  const [error, setError] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [isRegeneratingCopy, setIsRegeneratingCopy] = useState(false);
  const [textEdits, setTextEdits] = useState<TextEditState | null>(null);
  const [assetEdits, setAssetEdits] = useState<AssetEditState | null>(null);
  const [visualState, setVisualState] = useState<VisualState>({ status: "idle", message: "", progress: 0 });

  useEffect(() => {
    if (initialArtifact) {
      setArtifact(initialArtifact);
      try {
        window.localStorage.setItem(storageKey(initialArtifact.id), JSON.stringify(initialArtifact));
      } catch {
        // The review can still proceed; export may need server storage if browser storage is full.
      }
      return;
    }

    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) {
      setError("This draft is not available on the server or in this browser.");
      return;
    }

    try {
      setArtifact(GeneratedArtifactSchema.parse(JSON.parse(raw)));
    } catch {
      setError("This locally stored draft could not be read.");
    }
  }, [id, initialArtifact]);

  useEffect(() => {
    if (artifact) {
      setTextEdits(textEditStateFromArtifact(artifact));
      setAssetEdits(assetEditStateFromArtifact(artifact));
    }
  }, [artifact?.id]);

  useEffect(() => {
    if (!artifact || !wantsGeneratedVisual(artifact) || hasGeneratedVisual(artifact) || !artifact.imagePrompts[0]) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const prompt = artifact.imagePrompts[0];
    const imageSize = imageSizeForArtifact(artifact);
    const imageQuality = imageQualityForArtifact(artifact);
    const progressNoun = artifactProgressNoun(artifact.artifactType);
    const brand = artifact.brand;
    const request = artifact.request as { contextAttachments?: unknown } | undefined;
    const contextAttachments = Array.isArray(request?.contextAttachments) ? request.contextAttachments : [];

    async function runImageJob() {
      try {
        let jobId = readStoredImageJob(id, prompt, imageSize)?.jobId;
        let startedAt = readStoredImageJob(id, prompt, imageSize)?.startedAt ?? Date.now();
        setVisualState({
          status: "starting",
          message: "Preparing ImageGen request...",
          detail: jobId ? "Resuming the existing image job." : "Creating a background image job.",
          progress: 8,
          jobId,
          elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
        });

        if (!jobId) {
          const startResponse = await fetch("/api/image-jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              prompt,
              brand,
              size: imageSize,
              quality: imageQuality,
              outputFormat: "webp",
              outputCompression: 70,
              contextAttachments,
            }),
          });
          const start = (await startResponse.json()) as { jobId?: string; error?: string };

          if (!startResponse.ok || !start.jobId) {
            throw new Error(start.error ?? "Unable to start image generation.");
          }

          jobId = start.jobId;
          startedAt = Date.now();
          window.localStorage.setItem(imageJobStorageKey(id), JSON.stringify({ jobId, prompt, imageSize, startedAt }));
        }

        if (cancelled) return;
        setVisualState({
          status: "generating",
          message: "Queued with OpenAI.",
          detail: `Waiting for the ${progressNoun} to start rendering.`,
          progress: 18,
          jobId,
          rawStatus: "queued",
          elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
        });

        const poll = async () => {
          if (cancelled) return;
          attempts += 1;

          const params = new URLSearchParams({ prompt, size: imageSize, outputFormat: "webp", outputCompression: "70" });
          const response = await fetch(`/api/image-jobs/${jobId}?${params.toString()}`);
          const result = (await response.json()) as {
            status?: string;
            imageResult?: NonNullable<GeneratedArtifact["imageResults"]>[number];
            error?: string | { message?: string };
          };
          const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);

          if (!response.ok) {
            const message = typeof result.error === "string" ? result.error : result.error?.message;
            throw new Error(message ?? "Unable to check image generation.");
          }

          const imageResult = result.imageResult;
          if (imageResult?.dataUrl) {
            let message = "ImageGen visual attached to this draft.";
            setArtifact((current) => {
              if (!current) return current;
              const next: GeneratedArtifact = {
                ...current,
                imageResults: [imageResult],
                updatedAt: new Date().toISOString(),
              };

              try {
                window.localStorage.setItem(storageKey(id), JSON.stringify(next));
              } catch {
                message = "ImageGen visual is shown here, but your browser could not store the large image for refresh/export.";
              }

              return next;
            });
            window.localStorage.removeItem(imageJobStorageKey(id));
            setVisualState({
              status: "complete",
              message,
              detail: "Ready for review and export.",
              progress: 100,
              jobId,
              rawStatus: result.status,
              elapsedSeconds,
            });
            return;
          }

          if (result.status === "failed" || result.status === "cancelled") {
            const message = typeof result.error === "string" ? result.error : result.error?.message;
            throw new Error(message ?? "Image generation did not complete.");
          }

          if (attempts >= 200) {
            throw new Error("Image generation is taking longer than expected. Restart this image job or create a new draft.");
          }

          const nextProgress = progressForPoll(result.status, attempts);
          setVisualState({
            status: "generating",
            message: result.status === "queued" ? "Queued with OpenAI." : "ImageGen is rendering the visual.",
            detail:
              result.status === "queued"
                ? "Waiting for generation capacity."
              : attempts > 18
                  ? `Still rendering the ${progressNoun}. This job is alive; high-quality gpt-image-2 runs can take several minutes.`
                  : `Building the ${progressNoun} with embedded copy.`,
            progress: nextProgress,
            jobId,
            rawStatus: result.status,
            elapsedSeconds,
          });
          timeout = setTimeout(poll, 3000);
        };

        await poll();
      } catch (caught) {
        if (!cancelled) {
          setVisualState({
            status: "error",
            message: caught instanceof Error ? caught.message : "Unable to generate the visual.",
            detail: "The draft is still usable, but the visual did not attach.",
            progress: 0,
          });
        }
      }
    }

    runImageJob();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [artifact, id]);

  const evidence = useMemo(() => artifact?.sourceEvidence ?? [], [artifact]);
  const visualRequested = artifact ? wantsGeneratedVisual(artifact) : false;
  const visualReady = artifact ? hasGeneratedVisual(artifact) : false;
  const visualProgress = visualReady ? 100 : visualState.progress;
  const isBlocked = artifact ? artifact.review.issues.length > 0 : true;
  const waitingForVisual = visualRequested && !visualReady && visualState.status !== "error";
  const exportDisabled = isBlocked || waitingForVisual;
  const approvalDisabled = exportDisabled || Boolean(artifact?.review.approved);
  const exportLabel = isBlocked
    ? "Resolve issues before export"
    : waitingForVisual
      ? "Waiting for image..."
      : artifact?.review.approved
        ? "Approved"
        : "Approve artifact";
  const isStalePipeline = artifact ? (artifact.pipelineTrace?.version ?? "legacy") !== latestPipelineVersion : false;
  const logoVariants = artifact ? getBrandLogoVariants(artifact.brand) : [];
  const selectedLogo = artifact ? getBrandLogoForArtifact(artifact.brand, artifact.artifactType, assetEdits?.logoVariant) : undefined;

  function approveArtifact(current: GeneratedArtifact): GeneratedArtifact {
    return {
      ...current,
      review: {
        ...current.review,
        approved: true,
        approvedAt: new Date().toISOString(),
        reviewerName: "Internal reviewer",
      },
      updatedAt: new Date().toISOString(),
    };
  }

  function approveForExport() {
    if (!artifact || exportDisabled) return;
    const next = artifact.review.approved ? artifact : approveArtifact(artifact);
    window.localStorage.setItem(storageKey(id), JSON.stringify(next));
    setArtifact(next);
  }

  function restartVisual() {
    window.localStorage.removeItem(imageJobStorageKey(id));
    setVisualState({ status: "idle", message: "", progress: 0 });
    setArtifact((current) => {
      if (!current) return current;
      const next: GeneratedArtifact = {
        ...current,
        imageResults: [],
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(storageKey(id), JSON.stringify(next));
      return next;
    });
  }

  function updateTextEdit<K extends keyof TextEditState>(key: K, value: TextEditState[K]) {
    setTextEdits((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateAssetEdit<K extends keyof AssetEditState>(key: K, value: AssetEditState[K]) {
    setAssetEdits((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateProofPoint(index: number, value: string) {
    setTextEdits((current) => {
      if (!current) return current;
      const proofPoints = [...current.proofPoints];
      proofPoints[index] = value;
      return { ...current, proofPoints };
    });
  }

  function saveTextOnlyEdits() {
    if (!artifact || !textEdits) return;
    const next = applyTextOnlyEdits(artifact, textEdits);
    window.localStorage.setItem(storageKey(id), JSON.stringify(next));
    setArtifact(next);
    setTextEdits(textEditStateFromArtifact(next));
    setEditMessage("Text changes saved. Same image, layout, and logo; review and approve again before export.");
  }

  function regenerateVisualOnly() {
    if (!artifact || !assetEdits) return;
    const request = requestRecord(artifact);
    const visualInstruction = assetEdits.visualInstruction.trim();
    const prompt = artifact.imagePrompts[0] ?? "";
    const promptWithoutPriorRevision = prompt.replace(/\nUSER_VISUAL_REVISION=.*$/m, "");
    const revisedPrompt = visualInstruction
      ? `${promptWithoutPriorRevision}\nUSER_VISUAL_REVISION=${visualInstruction.slice(0, 350)}`
      : promptWithoutPriorRevision;
    const next: GeneratedArtifact = {
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
        visualInstruction,
        logoVariant: assetEdits.logoVariant,
        generateVisual: true,
      },
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.removeItem(imageJobStorageKey(id));
    window.localStorage.setItem(storageKey(id), JSON.stringify(next));
    setVisualState({ status: "idle", message: "", progress: 0 });
    setArtifact(next);
    setEditMessage("Visual regeneration started with your instruction.");
  }

  async function regenerateCopy() {
    if (!artifact || !textEdits || !assetEdits) return;
    setIsRegeneratingCopy(true);
    setEditMessage("");

    try {
      const request = requestRecord(artifact);
      const response = await fetch("/api/save-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...request,
          artifactType: artifact.artifactType,
          brand: artifact.brand,
          audience: artifact.audience,
          keyMessage: textEdits.headline.trim() || primaryHeadline(artifact),
          cta: textEdits.cta.trim() || primaryCta(artifact),
          visualInstruction: assetEdits.visualInstruction.trim(),
          logoVariant: assetEdits.logoVariant,
          strictlySourceGrounded: true,
          generateVisual: true,
        }),
      });
      const result = (await response.json()) as {
        artifact?: unknown;
        reviewUrl?: string;
        storage?: "server" | "client";
        error?: string;
      };

      if (!response.ok || !result.reviewUrl) {
        throw new Error(result.error ?? "Unable to regenerate copy.");
      }

      if (result.artifact && result.storage === "client") {
        const regenerated = GeneratedArtifactSchema.parse(result.artifact);
        window.localStorage.setItem(storageKey(regenerated.id), JSON.stringify(regenerated));
      }

      router.replace(result.reviewUrl);
    } catch (caught) {
      setEditMessage(caught instanceof Error ? caught.message : "Unable to regenerate copy.");
    } finally {
      setIsRegeneratingCopy(false);
    }
  }

  async function rebuildWithLatestPipeline() {
    if (!artifact) return;
    setIsRebuilding(true);
    setError("");

    try {
      const fallbackRequest = {
        artifactType: artifact.artifactType,
        brand: artifact.brand,
        audience: artifact.audience,
        keyMessage: primaryHeadline(artifact),
        cta: primaryCta(artifact),
        strictlySourceGrounded: true,
        generateVisual: true,
      };
      const requestBody =
        artifact.request && typeof artifact.request === "object"
          ? { ...fallbackRequest, ...(artifact.request as Record<string, unknown>), generateVisual: true }
          : fallbackRequest;
      const response = await fetch("/api/save-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = (await response.json()) as {
        artifact?: unknown;
        reviewUrl?: string;
        storage?: "server" | "client";
        error?: string;
      };

      if (!response.ok || !result.reviewUrl) {
        throw new Error(result.error ?? "Unable to rebuild this draft.");
      }

      if (result.artifact && result.storage === "client") {
        const rebuilt = GeneratedArtifactSchema.parse(result.artifact);
        window.localStorage.setItem(storageKey(rebuilt.id), JSON.stringify(rebuilt));
      }

      router.replace(result.reviewUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to rebuild this draft.");
    } finally {
      setIsRebuilding(false);
    }
  }

  if (error) {
    return (
      <section className="mx-auto grid max-w-3xl gap-4 px-5 py-10">
        <h1 className="text-3xl font-semibold text-[#142836]">Draft unavailable</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{error}</p>
        <Link className="w-fit rounded-full bg-[#0081A4] px-5 py-3 text-sm font-semibold text-white" href="/create">
          Create a new draft
        </Link>
      </section>
    );
  }

  if (!artifact) {
    return <p className="px-5 py-10 text-sm text-slate-600">Loading draft...</p>;
  }

  const displayHeadline = primaryHeadline(artifact);

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0081A4]">Review</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#142836]">{displayHeadline}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {artifact.brand} · {artifact.artifactType} · {artifact.audience}
          </p>
        </div>
        <Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white" href="/create">
          New artifact
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="grid gap-4">
          {visualRequested && (!visualReady || visualState.status === "error") ? (
            <section
              className={`rounded-md border p-3 text-sm ${
                visualState.status === "error"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-sky-200 bg-sky-50 text-sky-950"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{visualStatusLabel(visualState.status, visualReady)}</p>
                <span className="tabular-nums text-xs font-semibold">{visualProgress}%</span>
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-white/80"
                role="progressbar"
                aria-label="ImageGen visual progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={visualProgress}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    visualState.status === "error"
                      ? "bg-amber-500"
                      : visualReady || visualState.status === "complete"
                        ? "bg-emerald-600"
                        : "bg-[#0081A4]"
                  }`}
                  style={{ width: `${visualProgress}%` }}
                />
              </div>
              {visualState.detail ? <p className="mt-2 text-xs leading-5 opacity-80">{visualState.detail}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {visualState.rawStatus ? <span>Status: {visualState.rawStatus}</span> : null}
                {visualState.elapsedSeconds != null ? <span>Elapsed: {visualState.elapsedSeconds}s</span> : null}
                {!visualReady ? (
                  <button
                    type="button"
                    onClick={restartVisual}
                    className="rounded-md border border-sky-300 bg-white/70 px-2 py-1 font-semibold text-sky-900"
                  >
                    Restart image
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
          <ArtifactRenderer artifact={artifact} />
          <details className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <summary className="cursor-pointer font-semibold text-slate-900">Brief and source evidence</summary>
            <dl className="mt-4 grid gap-4 leading-6 md:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-900">Objective</dt>
                <dd>{artifact.brief.objective}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">CTA</dt>
                <dd>{artifact.brief.cta}</dd>
              </div>
            </dl>
            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4">
              {evidence.map((source) => (
                <article key={source.id} className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{source.label}</h3>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-teal-700 underline decoration-teal-300 underline-offset-2"
                      >
                        Open source
                      </a>
                    ) : null}
                  </div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{source.id}</p>
                  <p className="leading-6">{source.excerpt}</p>
                </article>
              ))}
            </div>
          </details>
        </main>

        <aside className="grid content-start gap-3">
          {artifact.compositionScore ? (
            <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-base font-semibold text-slate-900">
                Sendability details · {artifact.compositionScore.sendability}
              </summary>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{artifact.compositionScore.question}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    artifact.compositionScore.status === "pass"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : artifact.compositionScore.status === "warn"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {artifact.compositionScore.sendability}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>Whitespace {artifact.compositionScore.whitespaceDensity}</span>
                <span>Scaffold {artifact.compositionScore.templateScaffolding}</span>
                <span>Type {artifact.compositionScore.typographyQuality}</span>
                <span>Format {artifact.compositionScore.artifactMatch}</span>
                <span>Brand {artifact.compositionScore.brandFidelity}</span>
                <span>Relevance {artifact.compositionScore.brandRelevance}</span>
                <span>Boundary {artifact.compositionScore.brandBoundary}</span>
                <span>Text fit {artifact.compositionScore.textIntegration}</span>
              </div>
            </details>
          ) : null}

          {artifact.layoutQa ? (
            <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-base font-semibold text-slate-900">
                Layout QA · {artifact.layoutQa.sendability}
              </summary>
              <p className="mt-2 text-xs leading-5 text-slate-500">{artifact.layoutQa.question}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>Overflow {artifact.layoutQa.noTextOverflow}</span>
                <span>CTA {artifact.layoutQa.noCtaCollision}</span>
                <span>Proof width {artifact.layoutQa.proofLineWidth}</span>
                <span>Logo {artifact.layoutQa.logoOnce}</span>
                <span>Format {artifact.layoutQa.artifactFormatMatch}</span>
                <span>Export {artifact.layoutQa.exportReady}</span>
              </div>
              {artifact.layoutQa.issues.length ? (
                <ul className="mt-3 grid gap-1 text-xs leading-5 text-rose-800">
                  {artifact.layoutQa.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </details>
          ) : null}

          {textEdits ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Edit artifact text</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">These changes keep the same image, layout, and logo.</p>
              </div>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-slate-900">
                  Headline
                  <textarea
                    rows={2}
                    value={textEdits.headline}
                    onChange={(event) => updateTextEdit("headline", event.target.value)}
                    className="min-h-16 rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-900">
                  Deck
                  <textarea
                    rows={3}
                    value={textEdits.deck}
                    onChange={(event) => updateTextEdit("deck", event.target.value)}
                    className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="flex items-start gap-2 text-sm font-medium text-slate-900">
                  <input
                    type="checkbox"
                    checked={textEdits.showAudienceLabel}
                    onChange={(event) => updateTextEdit("showAudienceLabel", event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    Show audience label
                    <span className="block text-xs font-normal leading-5 text-slate-500">Hide this when the artifact already implies the audience.</span>
                  </span>
                </label>
                {textEdits.showAudienceLabel ? (
                  <label className="grid gap-1 text-sm font-medium text-slate-900">
                    Audience label
                    <input
                      value={textEdits.audienceLabel}
                      onChange={(event) => updateTextEdit("audienceLabel", event.target.value)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                ) : null}
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-slate-900">Proof points</p>
                  {textEdits.proofPoints.map((point, index) => (
                    <label key={index} className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Point {index + 1}
                      <textarea
                        rows={2}
                        value={point}
                        onChange={(event) => updateProofPoint(index, event.target.value)}
                        className="min-h-14 rounded-md border border-slate-200 px-3 py-2 text-sm normal-case leading-5 tracking-normal text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      />
                    </label>
                  ))}
                </div>
                <label className="grid gap-1 text-sm font-medium text-slate-900">
                  CTA
                  <input
                    value={textEdits.cta}
                    onChange={(event) => updateTextEdit("cta", event.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveTextOnlyEdits}
                  className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-[#0081A4] px-4 text-sm font-semibold text-white hover:bg-[#006985]"
                >
                  Save text changes
                </button>
                {editMessage ? <p className="rounded-md bg-slate-50 p-2 text-xs leading-5 text-slate-600">{editMessage}</p> : null}
              </div>
            </section>
          ) : null}

          {assetEdits ? (
            <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-base font-semibold text-slate-900">Regenerate visual</summary>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-slate-900">
                  Visual instruction
                  <textarea
                    rows={3}
                    value={assetEdits.visualInstruction}
                    onChange={(event) => updateAssetEdit("visualInstruction", event.target.value)}
                    placeholder="Example: more executive, less classroom photo, use abstract pathway shapes"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <button type="button" onClick={regenerateVisualOnly} className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  Regenerate visual only
                </button>
              </div>
            </details>
          ) : null}

          {assetEdits ? (
            <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-base font-semibold text-slate-900">Logo and brand assets</summary>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-slate-900">
                  Logo variant
                  <select
                    value={assetEdits.logoVariant}
                    onChange={(event) => updateAssetEdit("logoVariant", event.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
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
                <button
                  type="button"
                  onClick={regenerateCopy}
                  disabled={isRegeneratingCopy}
                  className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRegeneratingCopy ? "Regenerating..." : "Regenerate full draft"}
                </button>
              </div>
            </details>
          ) : null}

          <section className="sticky top-5 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
            {artifact.pipelineTrace ? (
              <details className="text-xs leading-5 text-slate-500">
                <summary className="cursor-pointer font-semibold">Pipeline details</summary>
                <p className="mt-1">
                  Studio pipeline {artifact.pipelineTrace.version} · {artifact.pipelineTrace.promptLength}/{artifact.pipelineTrace.promptTokenBudget} chars
                </p>
              </details>
            ) : null}
            {isStalePipeline ? (
              <button
                type="button"
                onClick={rebuildWithLatestPipeline}
                disabled={isRebuilding}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRebuilding ? "Rebuilding..." : "Rebuild with latest image pipeline"}
              </button>
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
              onClick={approveForExport}
              disabled={approvalDisabled}
              className={`rounded-md px-4 py-3 text-sm font-semibold ${
                approvalDisabled
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-[#0081A4] text-white hover:bg-[#006985]"
              }`}
            >
              {exportLabel}
            </button>
            {waitingForVisual ? <p className="text-xs leading-5 text-slate-500">The export will include the generated image once it attaches.</p> : null}
          </section>
          {artifact.review.approved ? (
            <>
              <ExportActions artifact={artifact} mode="primary" />
              <Link
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                href={`/exports/${id}`}
              >
                Open advanced export page
              </Link>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
