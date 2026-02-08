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

// Generic async client factory with dynamic imports to reduce cold start time
function createAsyncClientFactory<T>(
  envKey: string,
  clientName: string,
  factory: (apiKey: string) => Promise<T>
): () => Promise<T> {
  let client: T | null = null;
  return async () => {
    if (!client) {
      const apiKey = process.env[envKey];
      if (!apiKey) {
        throw new Error(
          `${envKey} environment variable is not set. ` +
          `Please add it to your .env.local file to use ${clientName}.`
        );
      }
      client = await factory(apiKey);
    }
    return client;
  };
}

export const getAnthropicClient = createAsyncClientFactory(
  "ANTHROPIC_API_KEY",
  "Anthropic Claude",
  async (apiKey) => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    return new Anthropic({ apiKey });
  }
);

export const getOpenAIClient = createAsyncClientFactory(
  "OPENAI_API_KEY",
  "OpenAI",
  async (apiKey) => {
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey });
  }
);
