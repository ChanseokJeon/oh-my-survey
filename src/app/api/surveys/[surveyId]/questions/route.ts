import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, questions, ensureDbReady, currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";
import { eq, asc, count } from "drizzle-orm";
import { createQuestionSchema } from "@/lib/validations/question";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  // Verify survey ownership
  const survey = await verifySurveyOwnership(surveyId, session.user.id);
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
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  // Verify survey ownership
  const survey = await verifySurveyOwnership(surveyId, session.user.id);
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
    const options = validated.type === "multiple_choice" ? validated.options : null;

    // For PGlite, use raw SQL due to drizzle-orm compatibility issues
    if (currentProvider === 'pglite') {
      const pglite = getPGliteInstance();
      if (!pglite) {
        throw new Error('PGlite instance not available');
      }
      const result = await pglite.query(
        `INSERT INTO questions (survey_id, type, title, options, required, "order")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, survey_id, type, title, options, required, "order", created_at, updated_at`,
        [surveyId, validated.type, validated.title, options ? JSON.stringify(options) : null, validated.required, order]
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    }

    // PostgreSQL: use drizzle ORM
    const [newQuestion] = await db
      .insert(questions)
      .values({
        surveyId,
        type: validated.type,
        title: validated.title,
        options,
        required: validated.required,
        order,
      })
      .returning();

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
