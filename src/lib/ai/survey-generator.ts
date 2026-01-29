import { z } from "zod";
import { getAnthropicClient } from "./client";

const SYSTEM_PROMPT = `You are an expert survey designer. Given a description of what the user wants to learn or measure, generate a comprehensive and well-structured survey.

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

export async function generateSurvey(
  description: string
): Promise<GeneratedSurvey> {
  const client = getAnthropicClient();

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

  // Extract text content from response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const rawText = content.text.trim();

  // Parse JSON response
  let surveyData: unknown;
  try {
    surveyData = JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
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
