import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

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

// Generic client factory to eliminate duplication
function createClientFactory<T>(
  envKey: string,
  clientName: string,
  factory: (apiKey: string) => T
): () => T {
  let client: T | null = null;
  return () => {
    if (!client) {
      const apiKey = process.env[envKey];
      if (!apiKey) {
        throw new Error(
          `${envKey} environment variable is not set. ` +
          `Please add it to your .env.local file to use ${clientName}.`
        );
      }
      client = factory(apiKey);
    }
    return client;
  };
}

export const getAnthropicClient = createClientFactory(
  "ANTHROPIC_API_KEY",
  "Anthropic Claude",
  (apiKey) => new Anthropic({ apiKey })
);

export const getOpenAIClient = createClientFactory(
  "OPENAI_API_KEY",
  "OpenAI",
  (apiKey) => new OpenAI({ apiKey })
);
