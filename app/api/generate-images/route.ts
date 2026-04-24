import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImagesFromPrompts } from "@/lib/generation/generateImages";

export const maxDuration = 300;

const ImageSizeSchema = z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "256x256", "512x512", "1792x1024", "1024x1792"]);

const GenerateImagesRequestSchema = z.object({
  prompt: z.string().min(1).optional(),
  prompts: z.array(z.string().min(1)).optional(),
  size: ImageSizeSchema.optional(),
  quality: z.enum(["low", "medium", "high", "auto"]).optional(),
  outputFormat: z.enum(["png", "jpeg", "webp"]).optional(),
  outputCompression: z.number().int().min(0).max(100).optional(),
  count: z.number().int().min(1).max(3).optional(),
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is not configured.",
        setup: "Add OPENAI_API_KEY to .env.local and restart the dev server.",
      },
      { status: 400 },
    );
  }

  const input = GenerateImagesRequestSchema.parse(await request.json());
  const prompts = input.prompts?.length ? input.prompts : input.prompt ? [input.prompt] : [];

  if (!prompts.length) {
    return NextResponse.json({ error: "Provide prompt or prompts." }, { status: 400 });
  }

  const count = input.count ?? 1;
  const imageResults = await generateImagesFromPrompts(prompts, {
    count,
    size: input.size,
    quality: input.quality,
    outputFormat: input.outputFormat,
    outputCompression: input.outputCompression,
  });

  return NextResponse.json({ imageResults });
}
