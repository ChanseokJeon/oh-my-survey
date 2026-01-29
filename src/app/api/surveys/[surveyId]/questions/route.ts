import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions } from "@/lib/db";
import { eq, and, asc, count } from "drizzle-orm";
import { createQuestionSchema } from "@/lib/validations/question";

export async function GET(
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

  const surveyQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(asc(questions.order));

  return NextResponse.json({ questions: surveyQuestions });
}

export async function POST(
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
    const validated = createQuestionSchema.parse(body);

    // Get next order number
    const [maxOrder] = await db
      .select({ count: count() })
      .from(questions)
      .where(eq(questions.surveyId, surveyId));

    const order = (maxOrder?.count ?? 0) + 1;

    const [newQuestion] = await db
      .insert(questions)
      .values({
        surveyId,
        type: validated.type,
        title: validated.title,
        options: validated.type === "multiple_choice" ? validated.options : null,
        required: validated.required,
        order,
      })
      .returning();

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
  }
}
