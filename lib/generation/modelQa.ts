import OpenAI from "openai";
import { z } from "zod";
import { failureMode, stageQa, statusFromFailures } from "@/lib/composition/qaHelpers";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type {
  CompositionScore,
  CompositionTemplate,
  DesignRecipe,
  FailureMode,
  FittedCopy,
  GeneratedArtifact,
  GeneratedCopy,
  LayoutContract,
  LayoutQa,
  StageQa,
} from "@/lib/schema/generatedArtifact";

const ModelQaResponseSchema = z.object({
  status: z.enum(["pass", "warn", "block"]),
  score: z.number().min(0).max(100),
  issues: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  failureModes: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().optional(),
        severity: z.enum(["warn", "block"]),
        introducedAt: z.string().optional(),
        missedBy: z.string().optional(),
        message: z.string().min(1),
      }),
    )
    .default([]),
});

type ModelQaInput = {
  request: ArtifactRequest;
  copy: GeneratedCopy;
  fittedCopy: FittedCopy;
  template: CompositionTemplate;
  designRecipe?: DesignRecipe;
  layoutContract?: LayoutContract;
  compositionScore?: CompositionScore;
  layoutQa?: LayoutQa;
  copyQualityQa?: StageQa;
  visualQa?: StageQa;
  renderQa?: StageQa;
  imagePrompts: string[];
  imageResults?: GeneratedArtifact["imageResults"];
};

function modelQaModel() {
  return process.env.OPENAI_MODEL_QA_MODEL ?? "gpt-5.4";
}

function modelQaEnabled() {
  if (process.env.OPENAI_MODEL_QA_ENABLED === "false") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

function includeImageInModelQa() {
  return process.env.OPENAI_MODEL_QA_INCLUDE_IMAGE !== "false";
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
    throw new Error("Model QA did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function averageScore(values: Array<number | undefined>) {
  const present = values.filter((value): value is number => typeof value === "number");
  if (!present.length) return 100;
  return Math.round(present.reduce((sum, value) => sum + value, 0) / present.length);
}

function imageDataUrl(input: ModelQaInput) {
  if (!includeImageInModelQa()) return undefined;
  const dataUrl = input.imageResults?.find((image) => image.dataUrl)?.dataUrl;
  if (!dataUrl) return undefined;
  if (dataUrl.length > 7_500_000) return undefined;
  return dataUrl;
}

function qaSummary(qa?: StageQa | LayoutQa) {
  if (!qa) return undefined;
  return {
    status: qa.status,
    issues: qa.issues,
    warnings: qa.warnings,
    score: "score" in qa ? qa.score : qa.sendability,
    failureModes: "failureModes" in qa ? qa.failureModes : undefined,
    metrics: "metrics" in qa ? qa.metrics : undefined,
  };
}

function promptForModel(input: ModelQaInput, imageIncluded: boolean) {
  return `You are the senior human-quality reviewer for the WCEPS Branding Tool.

Return ONLY compact JSON:
{
  "status": "pass" | "warn" | "block",
  "score": number,
  "issues": string[],
  "warnings": string[],
  "failureModes": [
    {
      "id": string,
      "severity": "warn" | "block",
      "introducedAt": "generateCopy" | "fitCopy" | "buildDesignRecipe" | "buildImagePrompt" | "imageJob" | "deterministicLayout" | "export" | "modelQa",
      "missedBy": "copyQualityQa" | "visualQa" | "renderQa" | "layoutQa" | "compositionScore" | "finalReview",
      "message": string
    }
  ]
}

Judge the artifact as a WCEPS-safe production reviewer.
Look for: awkward/repetitive copy, weak brand specificity, sibling-brand leakage, unsupported claims, poor text hierarchy, weak visual relevance, generic or mismatched imagery, fake/scaffolded content risk, CTA problems, and whether deterministic QA is too generous.
Use "block" only for issues that should prevent approval/export.
Use "warn" for quality concerns worth reviewing but not fatal.
If deterministic QA already caught the issue, include it only if it remains important.
If an image is attached, judge the visible art plate too. If no image is attached, judge the text, prompt, recipe, and QA evidence without pretending to see the final image.

Image attached for review: ${imageIncluded ? "yes" : "no"}

Context JSON:
${JSON.stringify(
  {
    request: {
      brand: input.request.brand,
      artifactType: input.request.artifactType,
      audience: input.request.audience,
      keyMessage: input.request.keyMessage,
      cta: input.request.cta,
      visualInstruction: input.request.visualInstruction,
    },
    fittedCopy: input.fittedCopy,
    generatedCopy: input.copy,
    template: input.template,
    designRecipe: input.designRecipe,
    layoutContract: input.layoutContract,
    imagePromptExcerpt: input.imagePrompts[0]?.slice(0, 2200),
    imageResultSummary: input.imageResults?.map((image) => ({
      model: image.model,
      size: image.size,
      quality: image.quality,
      outputFormat: image.outputFormat,
      hasDataUrl: Boolean(image.dataUrl),
      revisedPrompt: image.revisedPrompt?.slice(0, 1200),
    })),
    deterministicQa: {
      compositionScore: input.compositionScore
        ? {
            status: input.compositionScore.status,
            sendability: input.compositionScore.sendability,
            warnings: input.compositionScore.warnings,
            issues: input.compositionScore.issues,
          }
        : undefined,
      layoutQa: qaSummary(input.layoutQa),
      copyQualityQa: qaSummary(input.copyQualityQa),
      visualQa: qaSummary(input.visualQa),
      renderQa: qaSummary(input.renderQa),
    },
  },
  null,
  2,
)}`;
}

function fallbackQa(input: ModelQaInput): StageQa {
  return stageQa({
    question: "Would a senior WCEPS reviewer send this artifact without apology?",
    baseScore: averageScore([
      input.compositionScore?.sendability,
      input.layoutQa?.sendability,
      input.copyQualityQa?.score,
      input.visualQa?.score,
      input.renderQa?.score,
    ]),
    failureModes: [],
    metrics: {
      enabled: false,
      model: modelQaModel(),
      reason: process.env.OPENAI_API_KEY ? "disabled" : "missing_openai_api_key",
    },
  });
}

function normalizeModelQa(parsed: z.infer<typeof ModelQaResponseSchema>, input: ModelQaInput, imageIncluded: boolean): StageQa {
  const failureModes: FailureMode[] = parsed.failureModes.map((failure) =>
    failureMode(
      failure.id,
      failure.severity,
      failure.introducedAt ?? "modelQa",
      failure.message,
      failure.missedBy ?? "finalReview",
      failure.label,
    ),
  );

  if (!failureModes.length) {
    for (const issue of parsed.issues) {
      failureModes.push(failureMode("model_qa_issue", "block", "modelQa", issue, "finalReview"));
    }
    for (const warning of parsed.warnings) {
      failureModes.push(failureMode("model_qa_warning", "warn", "modelQa", warning, "finalReview"));
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
  const status = failureModes.length ? statusFromFailures(failureModes, score) : parsed.status === "pass" && score < 90 ? "warn" : parsed.status;

  return {
    question: "Would a senior WCEPS reviewer send this artifact without apology?",
    score,
    status,
    issues: failureModes.filter((failure) => failure.severity === "block").map((failure) => failure.message),
    warnings: failureModes.filter((failure) => failure.severity === "warn").map((failure) => failure.message),
    failureModes,
    metrics: {
      enabled: true,
      model: modelQaModel(),
      imageIncluded,
      deterministicScores: {
        sendability: input.compositionScore?.sendability,
        layoutQa: input.layoutQa?.sendability,
        copyQualityQa: input.copyQualityQa?.score,
        visualQa: input.visualQa?.score,
        renderQa: input.renderQa?.score,
      },
    },
  };
}

export function getModelQaConfig() {
  return {
    model: modelQaModel(),
    enabled: modelQaEnabled(),
    includeImage: includeImageInModelQa(),
  };
}

export async function evaluateModelQaWithModel(input: ModelQaInput): Promise<StageQa> {
  if (!modelQaEnabled()) return fallbackQa(input);

  const dataUrl = imageDataUrl(input);
  const imageIncluded = Boolean(dataUrl);
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: promptForModel(input, imageIncluded) }];

  if (dataUrl) {
    content.push({ type: "input_image", image_url: dataUrl, detail: "auto" });
  }

  try {
    const client = new OpenAI();
    const response = await client.responses.create({
      model: modelQaModel(),
      input: [{ role: "user", content }],
      store: false,
    } as never);
    const outputText = findOutputText(response) ?? "";
    const parsed = ModelQaResponseSchema.parse(parseJsonObject(outputText));
    return normalizeModelQa(parsed, input, imageIncluded);
  } catch (error) {
    console.warn("Model QA failed; using deterministic QA summary.", error);
    return stageQa({
      question: "Would a senior WCEPS reviewer send this artifact without apology?",
      baseScore: averageScore([
        input.compositionScore?.sendability,
        input.layoutQa?.sendability,
        input.copyQualityQa?.score,
        input.visualQa?.score,
        input.renderQa?.score,
      ]),
      failureModes: [
        failureMode(
          "model_qa_unavailable",
          "warn",
          "modelQa",
          "gpt-5.4 model QA was enabled but did not complete; deterministic QA still ran.",
          "finalReview",
        ),
      ],
      metrics: {
        enabled: true,
        model: modelQaModel(),
        imageIncluded,
        error: error instanceof Error ? error.message : "Unknown model QA error",
      },
    });
  }
}
