import { AppShell } from "@/components/layout/AppShell";
import { ArtifactRequestForm } from "@/components/forms";
import { Suspense } from "react";

export default function CreatePage() {
  const imageConfig = {
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    responsesModel: process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5.4-mini",
    size: process.env.OPENAI_IMAGE_SIZE ?? "1024x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY ?? "auto",
    outputFormat: process.env.OPENAI_IMAGE_OUTPUT_FORMAT ?? "webp",
  };

  return (
    <AppShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8">
        <div className="grid gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#0081A4]">Create artifact</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#142836]">Start with a strong WCEPS-safe setup.</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700">
            Pick a starter, adjust the four fields, and generate a reviewable artifact with source-grounded copy and app-owned brand assets.
          </p>
        </div>
        <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">Loading creator...</div>}>
          <ArtifactRequestForm imageConfig={imageConfig} />
        </Suspense>
      </section>
    </AppShell>
  );
}
