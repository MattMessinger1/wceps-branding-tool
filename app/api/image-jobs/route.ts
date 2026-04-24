import { NextResponse } from "next/server";
import { z } from "zod";
import { ContextAttachmentSchema } from "@/lib/schema/artifactRequest";
import { startBackgroundImageJob } from "@/lib/generation/imageJobs";
import { flushBraintrust, traceBraintrust } from "@/lib/observability/braintrust";

export const maxDuration = 10;

const ImageJobRequestSchema = z.object({
  prompt: z.string().min(1),
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "256x256", "512x512", "1792x1024", "1024x1792"]).optional(),
  quality: z.enum(["low", "medium", "high", "auto"]).optional(),
  outputFormat: z.enum(["png", "jpeg", "webp"]).optional(),
  outputCompression: z.number().int().min(0).max(100).optional(),
  brand: z.string().optional(),
  contextAttachments: z.array(ContextAttachmentSchema).max(2).optional(),
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
  }

  const input = ImageJobRequestSchema.parse(await request.json());

  try {
    const job = await traceBraintrust(
      "POST /api/image-jobs",
      {
        input,
        metadata: {
          brand: input.brand,
          size: input.size,
          quality: input.quality,
          outputFormat: input.outputFormat,
          attachmentCount: input.contextAttachments?.length ?? 0,
        },
      },
      () => startBackgroundImageJob(input.prompt, input),
    );
    await flushBraintrust();
    return NextResponse.json(job);
  } catch (caught) {
    await flushBraintrust();
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to start image generation." },
      { status: 500 },
    );
  }
}
