import { NextResponse } from "next/server";
import { readTraceArtifact } from "@/lib/trace-datasets";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ datasetId: string; artifactId: string }> }) {
  const { datasetId, artifactId } = await params;
  const artifact = await readTraceArtifact(datasetId, artifactId).catch(() => undefined);

  if (!artifact) {
    return NextResponse.json({ error: "Trace artifact JSON not found." }, { status: 404 });
  }

  return new NextResponse(artifact.json, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
