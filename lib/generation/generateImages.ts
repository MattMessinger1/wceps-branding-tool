import OpenAI from "openai";
import { z } from "zod";
import { type GeneratedImageResult } from "@/lib/schema/generatedArtifact";

const ImageSizeSchema = z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "256x256", "512x512", "1792x1024", "1024x1792"]);
const ImageQualitySchema = z.enum(["low", "medium", "high", "auto"]);
const ImageOutputFormatSchema = z.enum(["png", "jpeg", "webp"]);

export function getImageGenerationConfig(input?: {
  size?: string;
  quality?: string;
  outputFormat?: string;
  outputCompression?: string | number;
}) {
  const configuredSize = ImageSizeSchema.safeParse(input?.size ?? process.env.OPENAI_IMAGE_SIZE);
  const configuredQuality = ImageQualitySchema.safeParse(input?.quality ?? process.env.OPENAI_IMAGE_QUALITY);
  const configuredFormat = ImageOutputFormatSchema.safeParse(input?.outputFormat ?? process.env.OPENAI_IMAGE_OUTPUT_FORMAT);
  const configuredCompression = Number(input?.outputCompression ?? process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION);

  return {
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    size: configuredSize.success ? configuredSize.data : "1024x1024",
    quality: configuredQuality.success ? configuredQuality.data : "auto",
    outputFormat: configuredFormat.success ? configuredFormat.data : "webp",
    outputCompression: Number.isFinite(configuredCompression) ? Math.min(100, Math.max(0, Math.round(configuredCompression))) : 70,
  };
}

export async function generateImagesFromPrompts(
  prompts: string[],
  options: {
    count?: number;
    size?: string;
    quality?: string;
    outputFormat?: string;
    outputCompression?: string | number;
  } = {},
): Promise<GeneratedImageResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }

  const selectedPrompts = prompts.filter(Boolean).slice(0, options.count ?? 1);
  if (!selectedPrompts.length) {
    return [];
  }

  const client = new OpenAI();
  const config = getImageGenerationConfig(options);

  return Promise.all(
    selectedPrompts.map(async (prompt) => {
      const request = {
        model: config.model,
        prompt,
        size: config.size,
        quality: config.quality,
        output_format: config.outputFormat,
        ...(config.outputFormat === "png" ? {} : { output_compression: config.outputCompression }),
      };
      const result = await client.images.generate(request);
      const image = result.data?.[0];

      return {
        prompt,
        model: config.model,
        size: config.size,
        quality: config.quality,
        outputFormat: config.outputFormat,
        outputCompression: config.outputCompression,
        dataUrl: image?.b64_json ? `data:image/${config.outputFormat};base64,${image.b64_json}` : undefined,
        revisedPrompt: image?.revised_prompt,
      };
    }),
  );
}
