import OpenAI from "openai";
import type { ContextAttachment } from "@/lib/schema/artifactRequest";
import { type GeneratedImageResult } from "@/lib/schema/generatedArtifact";
import { getImageGenerationConfig } from "./generateImages";
import { DEFAULT_GPT_MODEL, getReasoningConfig } from "./openaiModelConfig";

type ImageJobOptions = {
  size?: string;
  quality?: string;
  outputFormat?: string;
  outputCompression?: string | number;
  brand?: string;
  logoUrl?: string;
  logoDataUrl?: string;
  contextAttachments?: ContextAttachment[];
};

function getResponsesModel() {
  return process.env.OPENAI_RESPONSES_MODEL ?? DEFAULT_GPT_MODEL;
}

function buildImageTool(config: ReturnType<typeof getImageGenerationConfig>) {
  return {
    type: "image_generation",
    model: config.model,
    action: "generate",
    background: "opaque",
    size: config.size,
    quality: config.quality,
    output_format: config.outputFormat,
    ...(config.outputFormat === "png" ? {} : { output_compression: config.outputCompression }),
  };
}

function findImageBase64(value: unknown): string | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageBase64(item);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  if (record.type === "image_generation_call" && typeof record.result === "string") {
    return record.result;
  }

  for (const key of ["output", "content", "result"]) {
    const found = findImageBase64(record[key]);
    if (found) return found;
  }

  return undefined;
}

function findRevisedPrompt(value: unknown): string | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRevisedPrompt(item);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  if (typeof record.revised_prompt === "string") {
    return record.revised_prompt;
  }

  for (const key of ["output", "content"]) {
    const found = findRevisedPrompt(record[key]);
    if (found) return found;
  }

  return undefined;
}

export async function startBackgroundImageJob(prompt: string, options: ImageJobOptions = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const config = getImageGenerationConfig(options);
  const client = new OpenAI();
  const content: Array<Record<string, string>> = [{ type: "input_text", text: prompt }];

  if (options.logoDataUrl || options.logoUrl) {
    content.push({ type: "input_image", image_url: options.logoDataUrl ?? options.logoUrl ?? "" });
  }

  for (const attachment of options.contextAttachments ?? []) {
    if (attachment.type.startsWith("image/")) {
      content.push({ type: "input_image", image_url: attachment.dataUrl });
    } else if (attachment.type === "application/pdf") {
      content.push({ type: "input_file", filename: attachment.name, file_data: attachment.dataUrl });
    }
  }

  const input = content.length > 1
    ? [
        {
          role: "user",
          content,
        },
      ]
    : prompt;
  const response = await client.responses.create({
    model: getResponsesModel(),
    reasoning: getReasoningConfig(),
    input,
    background: true,
    store: true,
    tools: [buildImageTool(config)],
    tool_choice: { type: "image_generation" },
  } as never);

  return {
    jobId: response.id,
    status: response.status,
    responsesModel: getResponsesModel(),
    imageConfig: config,
  };
}

export async function getBackgroundImageJobResult(jobId: string, prompt: string, options: ImageJobOptions = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const config = getImageGenerationConfig(options);
  const client = new OpenAI();
  const response = await client.responses.retrieve(jobId);
  const base64 = findImageBase64(response);
  const revisedPrompt = findRevisedPrompt(response);
  const dataUrl = base64?.startsWith("data:")
    ? base64
    : base64
      ? `data:image/${config.outputFormat};base64,${base64}`
      : undefined;
  const imageResult: GeneratedImageResult | undefined = dataUrl
    ? {
        prompt,
        model: config.model,
        size: config.size,
        quality: config.quality,
        outputFormat: config.outputFormat,
        outputCompression: config.outputCompression,
        dataUrl,
        revisedPrompt,
      }
    : undefined;

  return {
    jobId,
    status: response.status,
    imageResult,
    error: response.error,
  };
}
