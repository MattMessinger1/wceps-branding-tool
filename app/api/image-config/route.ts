import { NextResponse } from "next/server";
import { DEFAULT_GPT_MODEL, getReasoningEffort } from "@/lib/generation/openaiModelConfig";

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    responsesModel: process.env.OPENAI_RESPONSES_MODEL ?? DEFAULT_GPT_MODEL,
    reasoningEffort: getReasoningEffort(),
    sourceRefreshModel: process.env.OPENAI_SOURCE_REFRESH_MODEL ?? DEFAULT_GPT_MODEL,
    sourceRefreshEnabled: process.env.OPENAI_SOURCE_REFRESH_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    generateCopyModel: process.env.OPENAI_GENERATE_COPY_MODEL ?? DEFAULT_GPT_MODEL,
    generateCopyEnabled: process.env.OPENAI_GENERATE_COPY_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    copyFitModel: process.env.OPENAI_COPY_FIT_MODEL ?? DEFAULT_GPT_MODEL,
    copyFitEnabled: process.env.OPENAI_COPY_FIT_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    copyFitWebSearchEnabled: process.env.OPENAI_COPY_FIT_WEB_SEARCH_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    designRecipeModel: process.env.OPENAI_DESIGN_RECIPE_MODEL ?? DEFAULT_GPT_MODEL,
    designRecipeEnabled: process.env.OPENAI_DESIGN_RECIPE_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    modelQaModel: process.env.OPENAI_MODEL_QA_MODEL ?? DEFAULT_GPT_MODEL,
    modelQaEnabled: process.env.OPENAI_MODEL_QA_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    modelQaIncludeImage: process.env.OPENAI_MODEL_QA_INCLUDE_IMAGE !== "false",
    size: process.env.OPENAI_IMAGE_SIZE ?? "1024x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY ?? "high",
    outputFormat: process.env.OPENAI_IMAGE_OUTPUT_FORMAT ?? "webp",
    outputCompression: process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION ?? "70",
  });
}
