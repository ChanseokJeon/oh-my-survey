import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateSurvey } from "@/lib/ai/survey-generator";

const GenerateRequestSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must not exceed 2000 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate surveys." },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = GenerateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { description } = validation.data;

    // Generate survey using AI
    const survey = await generateSurvey(description);

    return NextResponse.json({ survey }, { status: 200 });
  } catch (error) {
    console.error("Survey generation error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      // API key missing
      if (error.message.includes("ANTHROPIC_API_KEY")) {
        return NextResponse.json(
          { error: "Server configuration error. AI service is not configured." },
          { status: 500 }
        );
      }

      // JSON parsing errors
      if (error.message.includes("parse")) {
        return NextResponse.json(
          { error: "Failed to generate valid survey. Please try again." },
          { status: 500 }
        );
      }

      // Schema validation errors
      if (error.message.includes("schema")) {
        return NextResponse.json(
          { error: "Generated survey format is invalid. Please try again." },
          { status: 500 }
        );
      }

      // Timeout or network errors (Anthropic SDK throws specific errors)
      if (
        error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("ECONNREFUSED")
      ) {
        return NextResponse.json(
          { error: "Request timeout. Please try again." },
          { status: 504 }
        );
      }
    }

    // Generic error fallback
    return NextResponse.json(
      { error: "An unexpected error occurred while generating the survey." },
      { status: 500 }
    );
  }
}
