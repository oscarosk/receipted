// One place for the language model. OpenAI via Chat Completions; model names are configurable.
import OpenAI from "openai";

export const SCREEN_MODEL = process.env.OPENAI_SCREEN_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini";
export const AGENT_MODEL = process.env.OPENAI_AGENT_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini";

export const hasLlm = () => Boolean(process.env.OPENAI_API_KEY);

let client: OpenAI | null = null;
export function llm() {
  client ??= new OpenAI();
  return client;
}

// Responses API settings. Reasoning models spend part of the budget thinking, so keep it roomy and effort low.
export const reasoning = { max_output_tokens: 3000, reasoning: { effort: "low" as const } };
