import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    responsesModel: process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5.4-mini",
    copyFitModel: process.env.OPENAI_COPY_FIT_MODEL ?? "gpt-5.4",
    copyFitEnabled: process.env.OPENAI_COPY_FIT_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    designRecipeModel: process.env.OPENAI_DESIGN_RECIPE_MODEL ?? "gpt-5.4",
    designRecipeEnabled: process.env.OPENAI_DESIGN_RECIPE_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    modelQaModel: process.env.OPENAI_MODEL_QA_MODEL ?? "gpt-5.4",
    modelQaEnabled: process.env.OPENAI_MODEL_QA_ENABLED !== "false" && Boolean(process.env.OPENAI_API_KEY),
    modelQaIncludeImage: process.env.OPENAI_MODEL_QA_INCLUDE_IMAGE !== "false",
    size: process.env.OPENAI_IMAGE_SIZE ?? "1024x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY ?? "high",
    outputFormat: process.env.OPENAI_IMAGE_OUTPUT_FORMAT ?? "webp",
    outputCompression: process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION ?? "70",
  });
}
