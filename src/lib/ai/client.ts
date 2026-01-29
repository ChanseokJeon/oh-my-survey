import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

export type AIProvider = "anthropic" | "openai";

export function getConfiguredProvider(): AIProvider | null {
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic";
  }
  return null;
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is not set. " +
        "Please add it to your .env.local file."
      );
    }

    anthropicClient = new Anthropic({
      apiKey,
    });
  }

  return anthropicClient;
}

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY environment variable is not set. " +
        "Please add it to your .env.local file."
      );
    }

    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}
