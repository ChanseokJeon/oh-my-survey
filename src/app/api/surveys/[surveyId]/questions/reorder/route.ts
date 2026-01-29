import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions } from "@/lib/db";
import { eq, and, inArray, asc } from "drizzle-orm";
import { reorderQuestionsSchema } from "@/lib/validations/question";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  // Verify survey ownership
  const [survey] = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, session.user.id)));

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { questionIds } = reorderQuestionsSchema.parse(body);

    // Verify all question IDs belong to this survey
    const existingQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(
        eq(questions.surveyId, surveyId),
        inArray(questions.id, questionIds)
      ));

    if (existingQuestions.length !== questionIds.length) {
      return NextResponse.json(
        { error: "Some question IDs are invalid" },
        { status: 400 }
      );
    }

    // Update order for each question
    await Promise.all(
      questionIds.map((id, index) =>
        db
          .update(questions)
          .set({ order: index + 1, updatedAt: new Date() })
          .where(eq(questions.id, id))
      )
    );

    // Return updated questions
    const updatedQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.surveyId, surveyId))
      .orderBy(asc(questions.order));

    return NextResponse.json({ questions: updatedQuestions });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
  }
}
