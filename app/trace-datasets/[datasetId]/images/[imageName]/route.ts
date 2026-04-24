import { NextResponse } from "next/server";
import { readTraceDatasetImage } from "@/lib/trace-datasets";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ datasetId: string; imageName: string }> }) {
  const { datasetId, imageName } = await params;
  const image = await readTraceDatasetImage(datasetId, imageName).catch(() => undefined);

  if (!image) {
    return NextResponse.json({ error: "Trace dataset image not found." }, { status: 404 });
  }

  return new NextResponse(image.buffer, {
    headers: {
      "content-type": image.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
