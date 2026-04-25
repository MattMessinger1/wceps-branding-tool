import { NextResponse } from "next/server";
import { loadBrandPack } from "@/lib/brands/loadBrandPack";
import { ArtifactRequestSchema } from "@/lib/schema/artifactRequest";
import { buildCreativeBrief } from "@/lib/generation/buildCreativeBrief";
import { generateCopyWithModel } from "@/lib/generation/generateCopy";
import { applySourceRefresh, refreshSourceContext } from "@/lib/generation/sourceRefresh";

export async function POST(request: Request) {
  const input = ArtifactRequestSchema.parse(await request.json());
  const pack = await loadBrandPack(input.brand || "WCEPS");
  const sourceRefresh = await refreshSourceContext(pack, input);
  const sourcePack = applySourceRefresh(pack, sourceRefresh);
  const brief = buildCreativeBrief(sourcePack, input);
  const copy = await generateCopyWithModel(sourcePack, brief, input);

  return NextResponse.json({ copy, brief, sourceRefresh });
}
