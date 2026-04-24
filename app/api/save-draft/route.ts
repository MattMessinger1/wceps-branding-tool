import { NextResponse } from "next/server";
import { saveDraft } from "@/lib/storage/drafts";
import { GeneratedArtifactSchema } from "@/lib/schema/generatedArtifact";
import { generateArtifact } from "@/lib/generation/generateArtifact";
import { flushBraintrust, traceBraintrust } from "@/lib/observability/braintrust";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const artifact = await traceBraintrust("POST /api/save-draft", { input: body }, async () =>
    "copy" in body && "brief" in body ? GeneratedArtifactSchema.parse(body) : await generateArtifact(body),
  );

  try {
    await saveDraft(artifact);
    await flushBraintrust();
    return NextResponse.json({ artifact, reviewUrl: `/review/${artifact.id}`, storage: "server" });
  } catch (error) {
    console.error("Falling back to client-side draft storage.", error);
    await flushBraintrust();
    return NextResponse.json({
      artifact,
      reviewUrl: `/review/${artifact.id}`,
      storage: "client",
      warning: "Draft generated, but server-side draft storage is unavailable. The browser will store this draft locally.",
    });
  }
}
