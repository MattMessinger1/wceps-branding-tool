import { NextResponse } from "next/server";
import { exportHtml, exportPdfPlaceholder, exportPngPlaceholder, exportReactSection } from "@/lib/export";
import { flushBraintrust, traceBraintrust } from "@/lib/observability/braintrust";
import { loadDraft } from "@/lib/storage/drafts";

async function handleExport(id: string | undefined, format = "html") {
  if (!id) {
    return NextResponse.json({ error: "Missing draft id." }, { status: 400 });
  }

  let artifact;
  try {
    artifact = await loadDraft(id);
  } catch {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  if (!artifact.review.approved) {
    return NextResponse.json({ error: "Export is blocked until a reviewer approves this artifact." }, { status: 409 });
  }

  if (format === "html") {
    const html = await traceBraintrust("exportHtml", { input: { artifact, format }, metadata: exportMetadata(artifact) }, () => exportHtml(artifact));
    await flushBraintrust();
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="${artifact.id}.html"`,
      },
    });
  }
  if (format === "react") {
    const react = await traceBraintrust("exportReactSection", { input: { artifact, format }, metadata: exportMetadata(artifact) }, () =>
      exportReactSection(artifact),
    );
    await flushBraintrust();
    return new Response(react, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${artifact.id}.tsx"`,
      },
    });
  }
  if (format === "prompt-pack") {
    return new Response(artifact.imagePrompts.join("\n\n---\n\n"), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${artifact.id}-prompt-pack.txt"`,
      },
    });
  }
  if (format === "copy") {
    return new Response(JSON.stringify({ copy: artifact.copy, brief: artifact.brief }, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${artifact.id}-copy.json"`,
      },
    });
  }
  if (format === "png") {
    await flushBraintrust();
    return NextResponse.json(exportPngPlaceholder(artifact));
  }
  if (format === "pdf") {
    await flushBraintrust();
    return NextResponse.json(exportPdfPlaceholder(artifact));
  }

  return NextResponse.json({ error: `Unsupported export format: ${format}` }, { status: 400 });
}

function exportMetadata(artifact: Awaited<ReturnType<typeof loadDraft>>) {
  return {
    artifactId: artifact.id,
    brand: artifact.brand,
    artifactType: artifact.artifactType,
    templateId: artifact.compositionTemplate?.id,
    layoutQa: artifact.layoutQa,
  };
}

export async function POST(request: Request) {
  const { id, format = "html" } = (await request.json()) as { id?: string; format?: string };
  return handleExport(id, format);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleExport(url.searchParams.get("id") ?? undefined, url.searchParams.get("format") ?? "html");
}
