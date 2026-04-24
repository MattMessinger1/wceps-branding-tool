export const DEFAULT_GPT_MODEL = "gpt-5.5";
export const DEFAULT_REASONING_EFFORT = "high";

export function getReasoningEffort() {
  return process.env.OPENAI_REASONING_EFFORT ?? DEFAULT_REASONING_EFFORT;
}

export function getReasoningConfig() {
  return {
    effort: getReasoningEffort(),
  };
}
