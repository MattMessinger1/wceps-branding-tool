import { NextResponse } from "next/server";
import { loadAllBrandPacks } from "@/lib/brands/loadBrandPack";
import { selectBrand } from "@/lib/brands/selectBrand";
import { ArtifactRequestSchema } from "@/lib/schema/artifactRequest";
import { buildCreativeBrief } from "@/lib/generation/buildCreativeBrief";

export async function POST(request: Request) {
  const input = ArtifactRequestSchema.parse(await request.json());
  const packs = await loadAllBrandPacks();
  const resolution = selectBrand(input, packs);
  const brief = buildCreativeBrief(resolution.selectedBrand, input);

  return NextResponse.json({ brief, resolution });
}
