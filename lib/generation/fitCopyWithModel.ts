import OpenAI from "openai";
import { fitCopy } from "@/lib/composition";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import { FittedCopySchema, type CompositionTemplate, type FittedCopy, type GeneratedCopy } from "@/lib/schema/generatedArtifact";

function copyFitModel() {
  return process.env.OPENAI_COPY_FIT_MODEL ?? "gpt-5.4";
}

function modelFitEnabled() {
  if (process.env.OPENAI_COPY_FIT_ENABLED === "false") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

function findOutputText(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findOutputText(item);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  if (record.type === "output_text" && typeof record.text === "string") return record.text;
  if (typeof record.text === "string") return record.text;

  for (const key of ["output", "content", "message"]) {
    const found = findOutputText(record[key]);
    if (found) return found;
  }

  return undefined;
}

function parseJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Copy-fit model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function promptForModel(copy: GeneratedCopy, request: ArtifactRequest, template: CompositionTemplate, deterministic: FittedCopy) {
  const proofInstruction =
    template.id === "campaign-flyer"
      ? "exactly 2"
      : template.id === "social-announcement"
        ? "2 short options, even if the social renderer uses fewer"
        : "2-3";

  return `You are the production copy-fit director for the WCEPS Branding Tool.

Return ONLY compact JSON:
{
  "headline": string,
  "deck": string,
  "proofPoints": string[],
  "cta": string,
  "ctaDetail"?: string,
  "footer"?: string
}

Rules:
- Use only the supplied generated copy, request, and deterministic baseline.
- Do not invent claims, metrics, endorsements, partnerships, pricing, or guarantees.
- Preserve selected brand boundaries.
- Make the copy polished, specific, and complete; never sound truncated.
- No dangling endings such as "fit in their.", "teaching, learning.", "to", or "with".
- Headline target: 6-12 words.
- Deck: exactly one complete sentence.
- Proof points: ${proofInstruction} complete, non-repetitive short statements.
- CTA: short button phrase. Put long email/contact details in ctaDetail.
- If the deterministic baseline is already strong, keep it mostly intact.

Context JSON:
${JSON.stringify(
  {
    brand: request.brand,
    artifactType: request.artifactType,
    audience: request.audience,
    keyMessage: request.keyMessage,
    cta: request.cta,
    template,
    generatedCopy: copy,
    deterministicBaseline: deterministic,
  },
  null,
  2,
)}`;
}

export function getCopyFitModelConfig() {
  return {
    model: copyFitModel(),
    enabled: modelFitEnabled(),
  };
}

export async function fitCopyWithModel(copy: GeneratedCopy, request: ArtifactRequest, template: CompositionTemplate): Promise<FittedCopy> {
  const deterministic = fitCopy(copy, request, template);

  if (!modelFitEnabled()) return deterministic;

  try {
    const client = new OpenAI();
    const response = await client.responses.create({
      model: copyFitModel(),
      input: promptForModel(copy, request, template, deterministic),
      store: false,
    } as never);
    const outputText = findOutputText(response) ?? "";
    return FittedCopySchema.parse({
      ...parseJsonObject(outputText),
      footer: deterministic.footer,
    });
  } catch (error) {
    console.warn("Model copy fit failed; using deterministic fit.", error);
    return deterministic;
  }
}
