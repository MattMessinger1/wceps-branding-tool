import { NextResponse } from "next/server";
import { loadBrandPack } from "@/lib/brands/loadBrandPack";
import { ArtifactRequestSchema } from "@/lib/schema/artifactRequest";
import { buildCreativeBrief } from "@/lib/generation/buildCreativeBrief";
import { generateCopy } from "@/lib/generation/generateCopy";

export async function POST(request: Request) {
  const input = ArtifactRequestSchema.parse(await request.json());
  const pack = await loadBrandPack(input.brand || "WCEPS");
  const brief = buildCreativeBrief(pack, input);
  const copy = generateCopy(pack, brief, input);

  return NextResponse.json({ copy, brief });
}
