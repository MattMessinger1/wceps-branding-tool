import type { Span } from "braintrust";

type TraceEvent = {
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  scores?: Record<string, number | null>;
};

type BraintrustModule = typeof import("braintrust");

let braintrustPromise: Promise<BraintrustModule | null> | null = null;
let loggerReady = false;

function loggingEnabled() {
  return process.env.BRAINTRUST_LOGGING_ENABLED === "true" && Boolean(process.env.BRAINTRUST_API_KEY);
}

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:")) return `[redacted data url ${value.length} chars]`;
    if (/sk-[a-zA-Z0-9_-]{12,}/.test(value)) return "[redacted secret]";
    return value.length > 1200 ? `${value.slice(0, 1200)}...[truncated ${value.length} chars]` : value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(record)) {
    const lower = key.toLowerCase();
    if (lower.includes("apikey") || lower.includes("api_key") || lower === "authorization") {
      next[key] = "[redacted secret]";
    } else if (lower === "dataurl" || lower === "file_data" || lower === "image_url" || lower === "logodataurl") {
      next[key] = typeof item === "string" ? `[redacted ${lower} ${item.length} chars]` : "[redacted attachment]";
    } else if (lower === "contextattachments") {
      next[key] = Array.isArray(item)
        ? item.map((attachment) => {
            const attachmentRecord = attachment && typeof attachment === "object" ? (attachment as Record<string, unknown>) : {};
            return {
              name: attachmentRecord.name,
              type: attachmentRecord.type,
              dataUrl: "[redacted attachment]",
            };
          })
        : "[redacted attachments]";
    } else if (lower === "imageresults") {
      next[key] = Array.isArray(item)
        ? item.map((image) => {
            const imageRecord = image && typeof image === "object" ? (image as Record<string, unknown>) : {};
            const redactedImage = redact(imageRecord) as Record<string, unknown>;
            return { ...redactedImage, dataUrl: "[redacted generated image]" };
          })
        : "[redacted generated images]";
    } else {
      next[key] = redact(item);
    }
  }

  return next;
}

async function getBraintrust() {
  if (!loggingEnabled()) return null;

  braintrustPromise ??= import("braintrust")
    .then((braintrust) => {
      braintrust.setMaskingFunction(redact);

      if (!loggerReady) {
        braintrust.initLogger({
          projectName: process.env.BRAINTRUST_PROJECT_NAME || "Brand Building",
          orgName: process.env.BRAINTRUST_ORG_NAME || "WCEPS",
          apiKey: process.env.BRAINTRUST_API_KEY,
          asyncFlush: true,
          debugLogLevel: false,
        });
        loggerReady = true;
      }

      return braintrust;
    })
    .catch((error) => {
      console.warn("Braintrust logging disabled after init failure.", error);
      return null;
    });

  return braintrustPromise;
}

export function sanitizeForBraintrust<T>(value: T): T {
  return redact(value) as T;
}

export async function traceBraintrust<T>(
  name: string,
  event: TraceEvent,
  callback: (span?: Span) => Promise<T> | T,
): Promise<T> {
  const braintrust = await getBraintrust();

  if (!braintrust) {
    return callback();
  }

  let callbackStarted = false;
  try {
    return await braintrust.traced(
      async (span) => {
        callbackStarted = true;
        span.log({
          input: sanitizeForBraintrust(event.input),
          metadata: sanitizeForBraintrust(event.metadata ?? {}),
          scores: event.scores,
        });
        const output = await callback(span);
        span.log({ output: sanitizeForBraintrust(event.output ?? output) });
        return output;
      },
      { name, type: "task" },
    );
  } catch (error) {
    if (callbackStarted) throw error;
    console.warn(`Braintrust trace failed for ${name}.`, error);
    return callback();
  }
}

export async function traceBraintrustStep<T>(
  span: Span | undefined,
  name: string,
  event: TraceEvent,
  callback: (span?: Span) => Promise<T> | T,
): Promise<T> {
  if (!span) return callback();

  let callbackStarted = false;
  try {
    return await span.traced(
      async (child) => {
        callbackStarted = true;
        child.log({
          input: sanitizeForBraintrust(event.input),
          metadata: sanitizeForBraintrust(event.metadata ?? {}),
          scores: event.scores,
        });
        const output = await callback(child);
        child.log({ output: sanitizeForBraintrust(event.output ?? output) });
        return output;
      },
      { name, type: "task" },
    );
  } catch (error) {
    if (callbackStarted) throw error;
    console.warn(`Braintrust step failed for ${name}.`, error);
    return callback();
  }
}

export async function flushBraintrust() {
  const braintrust = await getBraintrust();
  if (!braintrust) return;

  try {
    await braintrust.flush();
  } catch {
    // Logging should never break artifact generation.
  }
}
