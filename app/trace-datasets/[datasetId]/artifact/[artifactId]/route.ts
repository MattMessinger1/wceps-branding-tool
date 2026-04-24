import { NextResponse } from "next/server";
import { readTraceArtifactHtml } from "@/lib/trace-datasets";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ datasetId: string; artifactId: string }> }) {
  const { datasetId, artifactId } = await params;
  const html = await readTraceArtifactHtml(datasetId, artifactId).catch(() => undefined);

  if (!html) {
    return NextResponse.json({ error: "Trace artifact not found." }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
