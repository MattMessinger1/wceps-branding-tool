import OpenAI from "openai";
import { buildDesignRecipe } from "@/lib/composition";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import { DesignRecipeSchema, type CompositionTemplate, type DesignRecipe, type FittedCopy } from "@/lib/schema/generatedArtifact";
import { DEFAULT_GPT_MODEL, getReasoningConfig, getReasoningEffort } from "./openaiModelConfig";

function designRecipeModel() {
  return process.env.OPENAI_DESIGN_RECIPE_MODEL ?? DEFAULT_GPT_MODEL;
}

function designRecipeEnabled() {
  if (process.env.OPENAI_DESIGN_RECIPE_ENABLED === "false") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

function findOutputText(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findOutputText(item);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  if (record.type === "output_text" && typeof record.text === "string") return record.text;
  if (typeof record.text === "string") return record.text;

  for (const key of ["output", "content", "message"]) {
    const found = findOutputText(record[key]);
    if (found) return found;
  }

  return undefined;
}

function parseJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Design-recipe model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function promptForModel(request: ArtifactRequest, template: CompositionTemplate, fittedCopy: FittedCopy, deterministic: DesignRecipe) {
  return `You are a senior creative director for the WCEPS Branding Tool.

Choose and refine ONE approved design recipe. Return ONLY compact JSON:
{
  "id": "editorial-split" | "immersive-poster" | "proof-band" | "executive-sidecar" | "social-poster" | "email-strip",
  "source": "model-generated",
  "textZone": "left" | "right" | "center" | "lower" | "body",
  "visualZone": "full-bleed" | "right-field" | "left-field" | "top-band" | "sidecar" | "background",
  "density": "minimal" | "balanced" | "editorial" | "dense",
  "hierarchy": string,
  "artDirection": string,
  "placeholderStrategy": string,
  "appComposition": string,
  "promptDirectives": string[]
}

Rules:
- Choose only from the approved recipe ids and enum values above.
- This is not final graphic generation. It is the shared concept recipe that the app and ImageGen will both follow.
- Preserve exact app ownership of real text, official logos, CTA, and export.
- Make ImageGen feel like it is designing the whole artifact concept, not just making a decorative background.
- Do not request fake text, fake logos, blank cards, placeholder boxes, UI modules, or contact bars.
- Make the visual direction specific to the brand, audience, and artifact type.
- For dense one-pagers with 3 proof points or long decks, choose editorial-split, not proof-band. Keep long proof copy in readable app-rendered rows.
- Use proof-band only for concise one-pagers with very short proof text; never use it as a dark poster overlay for CCNA or WCEPS institutional one-pagers.
- Keep promptDirectives to 3-5 crisp instructions.
- If the deterministic baseline is already right, keep the same id and sharpen the wording.

Context JSON:
${JSON.stringify(
  {
    request: {
      brand: request.brand,
      artifactType: request.artifactType,
      audience: request.audience,
      keyMessage: request.keyMessage,
      visualInstruction: request.visualInstruction,
      contextAttachmentNames: request.contextAttachments.map((attachment) => attachment.name),
    },
    template,
    fittedCopy,
    deterministicBaseline: deterministic,
  },
  null,
  2,
)}`;
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function needsReadableOnePagerRecipe(request: ArtifactRequest, template: CompositionTemplate, fittedCopy: FittedCopy) {
  if (template.id !== "magazine-one-pager") return false;
  if (["CCNA", "WCEPS"].includes(request.brand)) return true;
  if (fittedCopy.proofPoints.length >= 3) return true;
  if (wordCount(fittedCopy.deck) > 14) return true;
  return fittedCopy.proofPoints.some((point) => wordCount(point) > 8);
}

function enforceSafeRecipe(request: ArtifactRequest, template: CompositionTemplate, fittedCopy: FittedCopy, recipe: DesignRecipe): DesignRecipe {
  if (!needsReadableOnePagerRecipe(request, template, fittedCopy)) return recipe;

  return {
    ...recipe,
    id: "editorial-split",
    textZone: "left",
    visualZone: "right-field",
    density: "editorial",
    hierarchy: "readable one-pager hierarchy with a headline/deck column, integrated image field, full-width proof rows, and compact CTA",
    appComposition: "official logo, exact headline, deck, proof rows, and CTA are app-rendered in readable zones; art stays secondary to message clarity",
    promptDirectives: [
      "editorial split one-pager with readable proof-row rhythm",
      "avoid dark poster overlays behind long copy",
      "create visual energy in the image field without fake charts, document modules, or text",
    ],
  };
}

export function getDesignRecipeModelConfig() {
  return {
    model: designRecipeModel(),
    reasoningEffort: getReasoningEffort(),
    enabled: designRecipeEnabled(),
  };
}

export async function buildDesignRecipeWithModel({
  request,
  template,
  fittedCopy,
}: {
  request: ArtifactRequest;
  template: CompositionTemplate;
  fittedCopy: FittedCopy;
}): Promise<DesignRecipe> {
  const deterministic = enforceSafeRecipe(request, template, fittedCopy, buildDesignRecipe({ request, template, fittedCopy }));

  if (!designRecipeEnabled()) return deterministic;

  try {
    const client = new OpenAI();
    const response = await client.responses.create({
      model: designRecipeModel(),
      reasoning: getReasoningConfig(),
      input: promptForModel(request, template, fittedCopy, deterministic),
      store: false,
    } as never);
    const outputText = findOutputText(response) ?? "";
    return enforceSafeRecipe(request, template, fittedCopy, DesignRecipeSchema.parse(parseJsonObject(outputText)));
  } catch (error) {
    console.warn("Model design recipe failed; using deterministic recipe.", error);
    return deterministic;
  }
}
