import { NextResponse } from "next/server";
import { loadBrandPack } from "@/lib/brands/loadBrandPack";
import { resolveArtifactFormat } from "@/lib/generation/artifactFormat";
import { ArtifactRequestSchema } from "@/lib/schema/artifactRequest";
import { buildCreativeBrief } from "@/lib/generation/buildCreativeBrief";
import { buildImagePromptContracts } from "@/lib/generation/buildImagePrompt";
import { buildLayoutContract } from "@/lib/generation/buildLayoutContract";
import { generateCopyWithModel } from "@/lib/generation/generateCopy";
import { resolveCompositionTemplate } from "@/lib/composition";
import { buildDesignRecipeWithModel } from "@/lib/generation/buildDesignRecipeWithModel";
import { fitCopyWithModel } from "@/lib/generation/fitCopyWithModel";
import { applySourceRefresh, refreshSourceContext } from "@/lib/generation/sourceRefresh";

export async function POST(request: Request) {
  const parsedInput = ArtifactRequestSchema.parse(await request.json());
  const input = {
    ...parsedInput,
    format: parsedInput.format || resolveArtifactFormat(parsedInput.artifactType),
  };
  const pack = await loadBrandPack(input.brand || "WCEPS");
  const sourceRefresh = await refreshSourceContext(pack, input);
  const sourcePack = applySourceRefresh(pack, sourceRefresh);
  const brief = buildCreativeBrief(sourcePack, input);
  const copy = await generateCopyWithModel(sourcePack, brief, input);
  const compositionTemplate = resolveCompositionTemplate(input.artifactType);
  const fittedCopy = await fitCopyWithModel(copy, input, compositionTemplate);
  const designRecipe = await buildDesignRecipeWithModel({ request: input, template: compositionTemplate, fittedCopy });
  const layoutContract = buildLayoutContract(sourcePack, brief, input, fittedCopy);
  const promptContracts = buildImagePromptContracts(sourcePack, brief, input, copy, layoutContract, designRecipe);

  return NextResponse.json({
    imagePrompts: promptContracts.map((contract) => contract.prompt),
    promptContracts,
    layoutContract,
    compositionTemplate,
    fittedCopy,
    designRecipe,
    brief,
    sourceRefresh,
  });
}
