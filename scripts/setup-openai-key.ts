#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const ENV_FILE = ".env.local";
const ENV_EXAMPLE_FILE = ".env.local.example";
const TARGET_KEYS = ["OPENAI_API_KEY", "OPENAI_IMAGE_MODEL", "OPENAI_IMAGE_SIZE", "OPENAI_IMAGE_QUALITY"] as const;
const IMAGE_SIZES = ["auto", "1024x1024", "1536x1024", "1024x1536", "256x256", "512x512", "1792x1024", "1024x1792"] as const;
const IMAGE_QUALITIES = ["low", "medium", "high", "auto"] as const;
const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "auto";
const KEY_PREFIX_PATTERN = /^sk-/i;

type EnvValues = Partial<Record<(typeof TARGET_KEYS)[number], string>>;

function splitLines(content: string): { lines: string[]; eol: string } {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  return { lines: content.split(/\r?\n/), eol };
}

function parseEnvValues(content: string): EnvValues {
  const values: EnvValues = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (!TARGET_KEYS.includes(key as (typeof TARGET_KEYS)[number])) {
      continue;
    }

    values[key as (typeof TARGET_KEYS)[number]] = unquoteEnvValue(rawValue);
  }

  return values;
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return trimmed;
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (first === last && (first === `"` || first === "'")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function formatEnvValue(value: string): string {
  if (/^[A-Za-z0-9._\/:-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function setEnvValue(content: string, key: string, value: string): string {
  if (!content.trim()) {
    return `${key}=${formatEnvValue(value)}\n`;
  }

  const { lines, eol } = splitLines(content);
  const updatedLines: string[] = [];
  let replaced = false;

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match || match[1] !== key) {
      updatedLines.push(line);
      continue;
    }

    if (!replaced) {
      updatedLines.push(`${key}=${formatEnvValue(value)}`);
      replaced = true;
    }
  }

  if (!replaced) {
    if (updatedLines.length && updatedLines[updatedLines.length - 1] !== "") {
      updatedLines.push("");
    }
    updatedLines.push(`${key}=${formatEnvValue(value)}`);
  }

  return updatedLines.join(eol).replace(/\s*$/, "") + eol;
}

function updateEnvContent(content: string, values: Record<(typeof TARGET_KEYS)[number], string>): string {
  let next = content;
  for (const key of TARGET_KEYS) {
    next = setEnvValue(next, key, values[key]);
  }
  return next;
}

function createLineReader() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function promptSecret(question: string, allowEmpty = false): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("This script must be run in an interactive terminal.");
  }

  process.stdout.write(question);

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = stdin.isRaw;

    let value = "";
    let skippingEscapeSequence = false;

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.off("error", onError);
      stdin.off("end", onEnd);
      if (!wasRaw) {
        stdin.setRawMode(false);
      }
      stdin.pause();
      stdout.write("\n");
    };

    const finish = (result: string) => {
      cleanup();
      resolve(result);
    };

    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onError = (error: Error) => fail(error);
    const onEnd = () => fail(new Error("Input stream closed before a value was entered."));
    const onData = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      for (const char of text) {
        if (skippingEscapeSequence) {
          if (/[A-Za-z~]/.test(char)) {
            skippingEscapeSequence = false;
          }
          continue;
        }

        if (char === "\r" || char === "\n") {
          if (!value && !allowEmpty) {
            stdout.write(question);
            continue;
          }
          finish(value);
          return;
        }

        if (char === "\u0003") {
          cleanup();
          process.exit(130);
        }

        if (char === "\u001b") {
          skippingEscapeSequence = true;
          continue;
        }

        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else if (char >= " ") {
          value += char;
        }
      }
    };

    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
    stdin.on("error", onError);
    stdin.on("end", onEnd);
  });
}

async function promptModel(rl: readline.Interface, defaultValue: string): Promise<string> {
  while (true) {
    const answer = (await prompt(
      rl,
      `OPENAI_IMAGE_MODEL [${defaultValue}] (for example ${DEFAULT_MODEL}, or type a custom model): `,
    )).trim();
    const value = answer.length ? answer : defaultValue;
    if (KEY_PREFIX_PATTERN.test(value)) {
      console.log("That looks like an API key, not an image model. Use gpt-image-2 unless you have a specific model name.");
      continue;
    }
    if (value.length) {
      return value;
    }
    console.log("Please enter a model name.");
  }
}

async function promptEnum(
  rl: readline.Interface,
  label: string,
  defaultValue: string,
  allowedValues: readonly string[],
): Promise<string> {
  const allowed = new Set(allowedValues);
  while (true) {
    const answer = (await prompt(rl, `${label} [${defaultValue}]: `)).trim().toLowerCase();
    const value = answer.length ? answer : defaultValue;
    if (allowed.has(value)) {
      return value;
    }
    console.log(`Choose one of: ${allowedValues.join(", ")}.`);
  }
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("This script must be run from a terminal.");
  }

  const cwd = process.cwd();
  const envPath = path.join(cwd, ENV_FILE);
  const examplePath = path.join(cwd, ENV_EXAMPLE_FILE);

  let existingContent = "";
  try {
    existingContent = await readFile(envPath, "utf8");
  } catch {
    try {
      existingContent = await readFile(examplePath, "utf8");
    } catch {
      existingContent = "";
    }
  }

  const existingValues = parseEnvValues(existingContent);
  const existingModel = existingValues.OPENAI_IMAGE_MODEL?.trim();
  const defaultModel = existingModel && !KEY_PREFIX_PATTERN.test(existingModel) ? existingModel : DEFAULT_MODEL;
  const defaultSize = IMAGE_SIZES.includes(existingValues.OPENAI_IMAGE_SIZE as (typeof IMAGE_SIZES)[number])
    ? (existingValues.OPENAI_IMAGE_SIZE as (typeof IMAGE_SIZES)[number])
    : DEFAULT_SIZE;
  const defaultQuality = IMAGE_QUALITIES.includes(existingValues.OPENAI_IMAGE_QUALITY as (typeof IMAGE_QUALITIES)[number])
    ? (existingValues.OPENAI_IMAGE_QUALITY as (typeof IMAGE_QUALITIES)[number])
    : DEFAULT_QUALITY;

  console.log("Enter your OpenAI settings. The API key will not be echoed.");

  const apiKey = await promptSecret("OPENAI_API_KEY: ");
  if (!apiKey.trim()) {
    throw new Error("OPENAI_API_KEY cannot be empty.");
  }

  const rl = createLineReader();
  try {
    const model = await promptModel(rl, defaultModel);
    const size = await promptEnum(rl, "OPENAI_IMAGE_SIZE", defaultSize, IMAGE_SIZES);
    const quality = await promptEnum(rl, "OPENAI_IMAGE_QUALITY", defaultQuality, IMAGE_QUALITIES);

    const nextContent = updateEnvContent(existingContent, {
      OPENAI_API_KEY: apiKey,
      OPENAI_IMAGE_MODEL: model,
      OPENAI_IMAGE_SIZE: size,
      OPENAI_IMAGE_QUALITY: quality,
    });

    await writeFile(envPath, nextContent, "utf8");

    console.log(`Updated ${path.relative(cwd, envPath) || ENV_FILE}.`);
    console.log("OpenAI image generation settings were saved. Restart the dev server for changes to take effect.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
