import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackgroundImageJobResult } from "@/lib/generation/imageJobs";
import { flushBraintrust, traceBraintrust } from "@/lib/observability/braintrust";

export const maxDuration = 10;

const ImageJobStatusSchema = z.object({
  artifactId: z.string().optional(),
  brand: z.string().optional(),
  prompt: z.string().min(1),
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "256x256", "512x512", "1792x1024", "1024x1792"]).optional(),
  quality: z.enum(["low", "medium", "high", "auto"]).optional(),
  outputFormat: z.enum(["png", "jpeg", "webp"]).optional(),
  outputCompression: z.coerce.number().int().min(0).max(100).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const input = ImageJobStatusSchema.parse(Object.fromEntries(url.searchParams));

  try {
    const result = await traceBraintrust(
      "GET /api/image-jobs/[id]",
      {
        input: { jobId: id, ...input },
        metadata: { jobId: id, artifactId: input.artifactId, brand: input.brand, size: input.size, quality: input.quality, outputFormat: input.outputFormat },
      },
      async (span) => {
        const result = await getBackgroundImageJobResult(id, input.prompt, input);
        return {
          ...result,
          imageResult: result.imageResult
            ? {
                ...result.imageResult,
                jobId: id,
                braintrustTrace: span
                  ? {
                      rowId: span.id,
                      spanId: span.spanId,
                      rootSpanId: span.rootSpanId,
                      link: span.link(),
                    }
                  : undefined,
              }
            : undefined,
          braintrustTrace: span
            ? {
                rowId: span.id,
                spanId: span.spanId,
                rootSpanId: span.rootSpanId,
                link: span.link(),
              }
            : undefined,
        };
      },
    );
    await flushBraintrust();
    return NextResponse.json(result);
  } catch (caught) {
    await flushBraintrust();
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to check image generation." },
      { status: 500 },
    );
  }
}
