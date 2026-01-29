import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";
import { publishSurveySchema } from "@/lib/validations/survey";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, session.user.id)));

  if (!existing) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action } = publishSurveySchema.parse(body);

    // Check if survey has questions before publishing
    if (action === "publish") {
      const [questionCount] = await db
        .select({ count: count() })
        .from(questions)
        .where(eq(questions.surveyId, surveyId));

      if (!questionCount || questionCount.count === 0) {
        return NextResponse.json(
          { error: "Cannot publish survey without questions" },
          { status: 400 }
        );
      }
    }

    const newStatus = action === "publish" ? "published" : action === "close" ? "closed" : "draft";

    const [updated] = await db
      .update(surveys)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(surveys.id, surveyId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
  }
}
