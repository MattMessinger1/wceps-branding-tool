import OpenAI from "openai";
import { filterBrandBoundaryItems, findBrandBoundaryTerms } from "@/lib/brands/brandBoundary";
import { selectAudienceMessaging } from "@/lib/brands/selectAudienceMessaging";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack } from "@/lib/schema/brandPack";
import type { CreativeBrief } from "@/lib/schema/creativeBrief";
import { GeneratedCopySchema, type GeneratedCopy } from "@/lib/schema/generatedArtifact";
import { DEFAULT_GPT_MODEL, getReasoningConfig, getReasoningEffort } from "./openaiModelConfig";

function concise(value: string, max = 170) {
  const cleaned = value.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  if (cleaned.length <= max) return cleaned;
  const sentenceEnd = cleaned.slice(0, max).match(/^(.+[.!?])\s+/);
  if (sentenceEnd?.[1] && sentenceEnd[1].length > 48) return sentenceEnd[1];
  const slice = cleaned.slice(0, max);
  let cut = slice.lastIndexOf(" ") > 32 ? slice.slice(0, slice.lastIndexOf(" ")) : slice;
  cut = cut
    .replace(/\bthat help educators reflect on$/i, "that help educators reflect on current practice")
    .replace(/\bhelps educators reflect on$/i, "helps educators reflect on current practice")
    .replace(/\bhelps teams use DOK to$/i, "helps teams use DOK accurately")
    .replace(/\buse DOK to$/i, "use DOK accurately")
    .replace(/\b(PRIME|DOK|CCNA|CALL|WCEPS)\s+V1\/V2$/i, "$1 V1 and V2");

  while (/\b(?:a|an|and|by|for|from|in|of|on|or|the|to|with)$/i.test(cut.trim())) {
    cut = cut.trim().replace(/\s+\S+$/, "");
  }

  return `${cut.replace(/[,:;–-]+$/g, "").replace(/[.!?]+$/g, "")}.`;
}

function isGenericProductionInstruction(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
  return [
    "create a useful brand-safe artifact",
    "create a useful artifact",
    "useful brand-safe artifact",
    "brand-safe artifact",
    "professional artifact",
  ].some((phrase) => normalized.includes(phrase));
}

function headlineOptions(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest) {
  const topic = request.topic.replace(/\.$/, "");
  const audience = brief.audience.replace(/\.$/, "");
  const base = {
    "CARE Coaching": [
      "Every Voice, Every Classroom, Every Learner",
      "Customized coaching for educator growth",
      "Consulting, coaching, and continuous learning for your team",
    ],
    CCNA: [
      "Turn insight into instructional impact",
      "Action-based data for school improvement",
      "Shared starting points for improving instruction",
    ],
    WebbAlign: [
      "Use DOK to strengthen alignment",
      "Build a more coherent learning system",
      "Straight-from-the-source DOK support",
    ],
    CALL: [
      "Focus on leadership. Focus on improvement.",
      "Leadership for learning, grounded in feedback",
      "A practical system for school improvement planning",
    ],
    "WIDA PRIME": [
      "Understand instructional materials alignment",
      "Explore WIDA PRIME correlations and alignments",
      "Clear information for instructional materials decisions",
    ],
    WCEPS: [
      "Chart your course with WCEPS",
      "Research-based pathways for education teams",
      "Customized support for schools and districts",
    ],
  }[pack.brandName] ?? [`${pack.brandName} support for ${audience}`, concise(topic, 62), pack.positioning.oneLiner];

  return request.keyMessage && !isGenericProductionInstruction(request.keyMessage)
    ? [concise(request.keyMessage, 72), ...base].slice(0, 3)
    : base;
}

export function generateCopy(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest): GeneratedCopy {
  const audience = selectAudienceMessaging(pack, request);
  const keyMessages = filterBrandBoundaryItems(pack.brandName, brief.keyMessages, request);
  const proofPoints = filterBrandBoundaryItems(pack.brandName, brief.proofPoints, request);
  const audienceMessages = filterBrandBoundaryItems(pack.brandName, audience.approvedMessages, request);
  const summaries = filterBrandBoundaryItems(
    pack.brandName,
    [pack.positioning.summary, pack.positioning.oneLiner, ...audienceMessages],
    request,
  );
  const primaryMessage = keyMessages[0] ?? summaries[0] ?? pack.positioning.oneLiner;
  const proof = proofPoints[0] ?? summaries[1] ?? pack.positioning.summary;
  const topicSentence = request.topic
    ? `For ${brief.audience}, this draft focuses on ${request.topic}.`
    : `For ${brief.audience}, this draft focuses on ${pack.topics.slice(0, 3).join(", ")}.`;

  const body =
    brief.artifactType === "landing-page"
      ? `${pack.positioning.summary} ${topicSentence} The page should guide readers from the local challenge to a clear next step while keeping the message grounded in WCEPS source language.`
      : `${primaryMessage} ${topicSentence} ${proof}`;

  const copy = {
    headlineOptions: headlineOptions(pack, brief, request),
    subheadOptions: [
      concise(summaries[0] ?? pack.positioning.summary, 150),
      concise(primaryMessage, 150),
      concise(audienceMessages[0] ?? summaries[1] ?? pack.positioning.oneLiner, 150),
    ],
    body: concise(body, brief.artifactType === "landing-page" ? 420 : 300),
    bullets: [
      ...keyMessages.slice(0, 3),
      ...proofPoints.slice(0, 2),
    ]
      .filter(Boolean)
      .slice(0, brief.artifactType === "flyer" ? 4 : 6)
      .map((item) => concise(item, 150)),
    cta: request.cta || brief.cta || audience.ctaSuggestions[0],
    footer: undefined,
  };

  return GeneratedCopySchema.parse(copy);
}

function generateCopyModel() {
  return process.env.OPENAI_GENERATE_COPY_MODEL ?? DEFAULT_GPT_MODEL;
}

function modelGenerateCopyEnabled() {
  if (process.env.OPENAI_GENERATE_COPY_ENABLED === "false") return false;
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
    throw new Error("Generate-copy model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function promptForModel(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest, deterministic: GeneratedCopy) {
  const sourceEvidence = pack.sourceEvidence.slice(0, 10);

  return `You are the source-grounded copywriter for the WCEPS Branding Tool.

Return ONLY compact JSON:
{
  "headlineOptions": string[],
  "subheadOptions": string[],
  "body": string,
  "bullets": string[],
  "cta": string,
  "footer"?: string
}

Rules:
- Use the selected brand/service only: ${pack.brandName}.
- Use the supplied refreshed source evidence and brand pack language.
- Do not invent claims, outcomes, endorsements, metrics, pricing, guarantees, or partnerships.
- Do not include internal tool language like "source-grounded", "brand-safe", "draft", or "artifact".
- Keep copy concrete and useful for the requested audience.
- Preserve CTA intent.
- Create options; do not do final layout fitting. The next step will fit visible text.
- If source evidence is thin, stay conservative and use the deterministic baseline.

Context JSON:
${JSON.stringify(
  {
    brand: pack.brandName,
    artifactType: brief.artifactType,
    audience: request.audience,
    keyMessage: request.keyMessage,
    topic: request.topic,
    goal: request.goal,
    cta: request.cta || brief.cta,
    brief,
    positioning: pack.positioning,
    approvedPhrases: pack.approvedPhrases.slice(0, 16),
    restrictedClaims: pack.restrictedClaims,
    sourceEvidence,
    deterministicBaseline: deterministic,
  },
  null,
  2,
)}`;
}

function visibleGeneratedText(copy: GeneratedCopy) {
  return [copy.headlineOptions.join(" "), copy.subheadOptions.join(" "), copy.body, copy.bullets.join(" "), copy.cta].join(" ");
}

function sourceSafeGeneratedCopy(candidate: GeneratedCopy, request: ArtifactRequest, deterministic: GeneratedCopy, brandName: string) {
  const selectedBrand = brandName || request.brand || "WCEPS";
  const leakage = findBrandBoundaryTerms(selectedBrand, visibleGeneratedText(candidate), { ...request, brand: selectedBrand });
  if (leakage.leakedTerms.length) return deterministic;

  return {
    ...candidate,
    footer: undefined,
  };
}

export function getGenerateCopyModelConfig() {
  return {
    model: generateCopyModel(),
    reasoningEffort: getReasoningEffort(),
    enabled: modelGenerateCopyEnabled(),
    sourceRefreshRequired: true,
  };
}

export async function generateCopyWithModel(pack: BrandPack, brief: CreativeBrief, request: ArtifactRequest): Promise<GeneratedCopy> {
  const deterministic = generateCopy(pack, brief, request);

  if (!modelGenerateCopyEnabled()) return deterministic;

  try {
    const client = new OpenAI();
    const response = await client.responses.create({
      model: generateCopyModel(),
      reasoning: getReasoningConfig(),
      input: promptForModel(pack, brief, request, deterministic),
      store: false,
    } as never);
    const outputText = findOutputText(response) ?? "";
    const parsed = GeneratedCopySchema.parse({
      ...parseJsonObject(outputText),
      cta: request.cta || brief.cta || deterministic.cta,
      footer: undefined,
    });

    return sourceSafeGeneratedCopy(parsed, request, deterministic, pack.brandName);
  } catch (error) {
    console.warn("Model copy generation failed; using deterministic copy.", error);
    return deterministic;
  }
}
