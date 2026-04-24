import { NextResponse } from "next/server";
import { refreshArtifactStageQa } from "@/lib/generation/generateArtifactImage";
import { flushBraintrust, traceBraintrust } from "@/lib/observability/braintrust";
import { GeneratedArtifactSchema } from "@/lib/schema/generatedArtifact";
import { saveDraft } from "@/lib/storage/drafts";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const artifact = GeneratedArtifactSchema.parse(body);

  try {
    const refreshed = await traceBraintrust(
      "POST /api/refresh-qa",
      {
        input: {
          artifactId: artifact.id,
          brand: artifact.brand,
          artifactType: artifact.artifactType,
          imageResultCount: artifact.imageResults?.length ?? 0,
        },
        metadata: {
          artifactId: artifact.id,
          brand: artifact.brand,
          artifactType: artifact.artifactType,
        },
      },
      () => refreshArtifactStageQa(artifact),
    );
    await saveDraft(refreshed).catch(() => undefined);
    await flushBraintrust();
    return NextResponse.json({ artifact: refreshed });
  } catch (caught) {
    await flushBraintrust();
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to refresh artifact QA." },
      { status: 500 },
    );
  }
}
