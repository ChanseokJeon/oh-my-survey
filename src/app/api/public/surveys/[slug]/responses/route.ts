import { NextResponse } from "next/server";
import { db, surveys, questions, responses } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { submitResponseSchema } from "@/lib/validations/response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Find published survey by slug
  const [survey] = await db
    .select({
      id: surveys.id,
      status: surveys.status,
    })
    .from(surveys)
    .where(and(eq(surveys.slug, slug), eq(surveys.status, "published")));

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Get questions to validate required fields
  const surveyQuestions = await db
    .select({
      id: questions.id,
      type: questions.type,
      required: questions.required,
    })
    .from(questions)
    .where(eq(questions.surveyId, survey.id))
    .orderBy(asc(questions.order));

  try {
    const body = await request.json();
    const { answers } = submitResponseSchema.parse(body);

    // Validate required questions are answered
    const missingRequired = surveyQuestions
      .filter((q) => q.required)
      .filter((q) => {
        const answer = answers[q.id];
        if (answer === undefined || answer === null) return true;
        if (typeof answer === "string" && answer.trim() === "") return true;
        if (Array.isArray(answer) && answer.length === 0) return true;
        return false;
      });

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required answers",
          questionIds: missingRequired.map((q) => q.id),
        },
        { status: 400 }
      );
    }

    // Validate answer types match question types
    for (const question of surveyQuestions) {
      const answer = answers[question.id];
      if (answer === undefined) continue;

      switch (question.type) {
        case "short_text":
        case "long_text":
        case "yes_no":
          if (typeof answer !== "string") {
            return NextResponse.json(
              { error: `Invalid answer type for question ${question.id}` },
              { status: 400 }
            );
          }
          break;
        case "multiple_choice":
          if (typeof answer !== "string") {
            return NextResponse.json(
              { error: `Invalid answer type for question ${question.id}` },
              { status: 400 }
            );
          }
          break;
        case "rating":
          if (typeof answer !== "number" || answer < 1 || answer > 5) {
            return NextResponse.json(
              { error: `Invalid rating for question ${question.id}` },
              { status: 400 }
            );
          }
          break;
      }
    }

    // Get IP address
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] || realIp || null;

    // Save response
    const [newResponse] = await db
      .insert(responses)
      .values({
        surveyId: survey.id,
        answersJson: answers as Record<string, string | string[] | number>,
        ipAddress,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Response submitted successfully",
        responseId: newResponse.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
  }
}
