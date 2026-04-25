import OpenAI from "openai";
import { filterBrandBoundaryEvidence } from "@/lib/brands/brandBoundary";
import type { ArtifactRequest } from "@/lib/schema/artifactRequest";
import type { BrandPack, SourceEvidence } from "@/lib/schema/brandPack";
import { DEFAULT_GPT_MODEL, getReasoningConfig, getReasoningEffort } from "./openaiModelConfig";

export type SourceRefresh = {
  enabled: boolean;
  model: string;
  reasoningEffort: string;
  webSearchEnabled: boolean;
  domains: string[];
  evidence: SourceEvidence[];
  summary: string;
  queries: string[];
  source: "brand-pack" | "web-search";
};

function sourceRefreshModel() {
  return process.env.OPENAI_SOURCE_REFRESH_MODEL ?? DEFAULT_GPT_MODEL;
}

function sourceRefreshEnabled() {
  if (process.env.OPENAI_SOURCE_REFRESH_ENABLED === "false") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

function officialDomains(pack: BrandPack) {
  const urls = [...pack.sourceOfTruth, ...pack.sourceEvidence.map((item) => item.url)];
  const domains = new Set<string>();

  for (const url of urls) {
    try {
      domains.add(new URL(url).hostname.replace(/^www\./, ""));
    } catch {
      // Ignore malformed source URLs; brand-pack schema normally prevents these.
    }
  }

  return [...domains].slice(0, 8);
}

function evidenceFallback(pack: BrandPack, request: ArtifactRequest): SourceEvidence[] {
  return filterBrandBoundaryEvidence(pack.brandName, pack.sourceEvidence, request).slice(0, 8);
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
    throw new Error("Source refresh model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function sourceRefreshPrompt(pack: BrandPack, request: ArtifactRequest, fallbackEvidence: SourceEvidence[]) {
  return `You are refreshing official source context for the WCEPS Branding Tool.

Return ONLY compact JSON:
{
  "summary": string,
  "queries": string[],
  "evidence": Array<{ "url": string, "label": string, "excerpt": string }>
}

Rules:
- Search only the approved domains provided by the tool.
- Use the selected brand/service only: ${pack.brandName}.
- Audience: ${request.audience}.
- Artifact type: ${request.artifactType}.
- Key message/topic: ${request.keyMessage || request.topic}.
- CTA intent: ${request.cta}.
- Choose evidence that helps create the best visible marketing copy.
- Do not add unsupported claims, metrics, endorsements, guarantees, pricing, or effectiveness claims.
- Keep excerpts short, factual, and directly useful for copywriting.
- If search results are thin, use the supplied baseline evidence.

Baseline evidence JSON:
${JSON.stringify(fallbackEvidence, null, 2)}`;
}

function allowedUrl(url: string, domains: string[]) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function normalizeEvidence(rawEvidence: unknown, domains: string[], fallbackEvidence: SourceEvidence[]): SourceEvidence[] {
  if (!Array.isArray(rawEvidence)) return fallbackEvidence;
  const normalized = rawEvidence
    .map((item, index) => {
      const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const url = typeof record.url === "string" ? record.url : "";
      const label = typeof record.label === "string" ? record.label : `Refreshed source ${index + 1}`;
      const excerpt = typeof record.excerpt === "string" ? record.excerpt.replace(/\s+/g, " ").trim() : "";

      if (!url || !excerpt || !allowedUrl(url, domains)) return undefined;
      return {
        id: `source-refresh-${index + 1}`,
        url,
        label,
        excerpt: excerpt.slice(0, 420),
      } satisfies SourceEvidence;
    })
    .filter((item): item is SourceEvidence => Boolean(item));

  return normalized.length ? normalized.slice(0, 8) : fallbackEvidence;
}

export function getSourceRefreshConfig() {
  return {
    model: sourceRefreshModel(),
    reasoningEffort: getReasoningEffort(),
    enabled: sourceRefreshEnabled(),
    webSearchEnabled: sourceRefreshEnabled(),
  };
}

export async function refreshSourceContext(pack: BrandPack, request: ArtifactRequest): Promise<SourceRefresh> {
  const fallbackEvidence = evidenceFallback(pack, request);
  const domains = officialDomains(pack);
  const fallback: SourceRefresh = {
    enabled: sourceRefreshEnabled(),
    model: sourceRefreshModel(),
    reasoningEffort: getReasoningEffort(),
    webSearchEnabled: false,
    domains,
    evidence: fallbackEvidence,
    summary: fallbackEvidence.map((item) => item.excerpt).join(" "),
    queries: [],
    source: "brand-pack",
  };

  if (!sourceRefreshEnabled() || domains.length === 0) return fallback;

  try {
    const client = new OpenAI();
    const response = await client.responses.create({
      model: sourceRefreshModel(),
      reasoning: getReasoningConfig(),
      input: sourceRefreshPrompt(pack, request, fallbackEvidence),
      tools: [
        {
          type: "web_search",
          filters: { allowed_domains: domains },
          search_context_size: "medium",
        },
      ],
      tool_choice: {
        type: "allowed_tools",
        mode: "required",
        tools: [{ type: "web_search" }],
      },
      include: ["web_search_call.action.sources"],
      store: false,
    } as never);
    const outputText = findOutputText(response) ?? "";
    const parsed = parseJsonObject(outputText) as Record<string, unknown>;
    const evidence = normalizeEvidence(parsed.evidence, domains, fallbackEvidence);

    return {
      ...fallback,
      webSearchEnabled: true,
      evidence,
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      queries: Array.isArray(parsed.queries) ? parsed.queries.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
      source: "web-search",
    };
  } catch (error) {
    console.warn("Source refresh failed; using brand-pack evidence.", error);
    return fallback;
  }
}

export function applySourceRefresh(pack: BrandPack, refresh: SourceRefresh): BrandPack {
  const byUrlAndExcerpt = new Set(pack.sourceEvidence.map((item) => `${item.url}::${item.excerpt}`));
  const refreshed = refresh.evidence.filter((item) => {
    const key = `${item.url}::${item.excerpt}`;
    if (byUrlAndExcerpt.has(key)) return false;
    byUrlAndExcerpt.add(key);
    return true;
  });

  return {
    ...pack,
    sourceEvidence: [...refreshed, ...pack.sourceEvidence],
  };
}
