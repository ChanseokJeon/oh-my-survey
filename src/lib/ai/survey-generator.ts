import { z } from "zod";
import { getAnthropicClient, getOpenAIClient, getConfiguredProvider } from "./client";

const SYSTEM_PROMPT = `You are an expert survey designer. Given a description of what the user wants to learn or measure, generate a comprehensive and well-structured survey.

IMPORTANT: Detect the language of the user's input and generate the survey in that SAME language.
- If the user writes in Korean (한국어), generate ALL content in Korean including title, questions, and options.
- If the user writes in English, generate ALL content in English.
- This is a hard requirement - never mix languages.

Your output MUST be valid JSON matching this exact schema:
{
  "title": "Survey Title (max 200 characters)",
  "questions": [
    {
      "type": "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating",
      "title": "Question text",
      "options": ["Option 1", "Option 2"] (only for multiple_choice),
      "required": true | false
    }
  ]
}

Guidelines:
- Create 5-15 questions depending on the topic complexity
- Use a variety of question types appropriate to the data being collected
- For multiple_choice questions, provide 3-6 clear, mutually exclusive options
- For rating questions, the scale is assumed to be 1-5
- Mark essential questions as required: true
- Write clear, unbiased question text
- Order questions logically from general to specific
- DO NOT include any markdown, explanations, or text outside the JSON object
- Return ONLY the raw JSON object`;

const QuestionSchema = z.object({
  type: z.enum(["short_text", "long_text", "multiple_choice", "yes_no", "rating"]),
  title: z.string().min(1).max(500),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});

const GeneratedSurveySchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(QuestionSchema).min(1).max(50),
});

export type QuestionType = z.infer<typeof QuestionSchema>["type"];
export type GeneratedQuestion = z.infer<typeof QuestionSchema>;
export type GeneratedSurvey = z.infer<typeof GeneratedSurveySchema>;

async function generateWithAnthropic(description: string): Promise<string> {
  const client = await getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a survey for: ${description}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return content.text.trim();
}

async function generateWithOpenAI(description: string): Promise<string> {
  const client = await getOpenAIClient();

  const response = await client.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Generate a survey for: ${description}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response content from OpenAI");
  }

  return content.trim();
}

export async function generateSurvey(
  description: string
): Promise<GeneratedSurvey> {
  const provider = getConfiguredProvider();

  if (!provider) {
    throw new Error(
      "No AI provider configured. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env.local file."
    );
  }

  let rawText: string;

  if (provider === "openai") {
    rawText = await generateWithOpenAI(description);
  } else {
    rawText = await generateWithAnthropic(description);
  }

  // Parse JSON response
  let surveyData: unknown;
  try {
    surveyData = JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Validate with Zod schema
  const validationResult = GeneratedSurveySchema.safeParse(surveyData);

  if (!validationResult.success) {
    throw new Error(
      `Generated survey does not match expected schema: ${validationResult.error.message}`
    );
  }

  return validationResult.data;
}
