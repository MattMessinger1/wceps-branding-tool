import { NextResponse } from "next/server";
import { loadBrandPack } from "@/lib/brands/loadBrandPack";
import { resolveArtifactFormat } from "@/lib/generation/artifactFormat";
import { ArtifactRequestSchema } from "@/lib/schema/artifactRequest";
import { buildCreativeBrief } from "@/lib/generation/buildCreativeBrief";
import { buildImagePromptContracts } from "@/lib/generation/buildImagePrompt";
import { buildLayoutContract } from "@/lib/generation/buildLayoutContract";
import { generateCopy } from "@/lib/generation/generateCopy";
import { resolveCompositionTemplate } from "@/lib/composition";
import { buildDesignRecipeWithModel } from "@/lib/generation/buildDesignRecipeWithModel";
import { fitCopyWithModel } from "@/lib/generation/fitCopyWithModel";

export async function POST(request: Request) {
  const parsedInput = ArtifactRequestSchema.parse(await request.json());
  const input = {
    ...parsedInput,
    format: parsedInput.format || resolveArtifactFormat(parsedInput.artifactType),
  };
  const pack = await loadBrandPack(input.brand || "WCEPS");
  const brief = buildCreativeBrief(pack, input);
  const copy = generateCopy(pack, brief, input);
  const compositionTemplate = resolveCompositionTemplate(input.artifactType);
  const fittedCopy = await fitCopyWithModel(copy, input, compositionTemplate);
  const designRecipe = await buildDesignRecipeWithModel({ request: input, template: compositionTemplate, fittedCopy });
  const layoutContract = buildLayoutContract(pack, brief, input, copy);
  const promptContracts = buildImagePromptContracts(pack, brief, input, copy, layoutContract, designRecipe);

  return NextResponse.json({
    imagePrompts: promptContracts.map((contract) => contract.prompt),
    promptContracts,
    layoutContract,
    compositionTemplate,
    fittedCopy,
    designRecipe,
    brief,
  });
}
