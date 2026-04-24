import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    responsesModel: process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5.4-mini",
    size: process.env.OPENAI_IMAGE_SIZE ?? "1024x1024",
    quality: process.env.OPENAI_IMAGE_QUALITY ?? "high",
    outputFormat: process.env.OPENAI_IMAGE_OUTPUT_FORMAT ?? "webp",
    outputCompression: process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION ?? "70",
  });
}
