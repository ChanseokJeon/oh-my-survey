import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions, ensureDbReady, currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";
import { eq, count } from "drizzle-orm";
import { publishSurveySchema } from "@/lib/validations/survey";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";
import { handleApiError } from "@/lib/utils/api-error";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

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

  // Verify ownership
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
  const existing = await verifySurveyOwnership(surveyId, actualUserId);

  if (!existing) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action } = publishSurveySchema.parse(body);

    const newStatus = action === "publish" ? "published" : action === "close" ? "closed" : "draft";

    // For PGlite, use raw SQL
    if (currentProvider === 'pglite') {
      const pglite = getPGliteInstance();
      if (!pglite) {
        throw new Error('PGlite instance not available');
      }

      // Check if survey has questions before publishing
      if (action === "publish") {
        const countResult = await pglite.query<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM questions WHERE survey_id = $1`,
          [surveyId]
        );
        const qCount = parseInt(countResult.rows[0]?.count || '0', 10);
        if (qCount === 0) {
          return NextResponse.json(
            { error: "Cannot publish survey without questions" },
            { status: 400 }
          );
        }
      }

      const result = await pglite.query(
        `UPDATE surveys SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
        [newStatus, new Date(), surveyId]
      );

      return NextResponse.json(result.rows[0]);
    }

    // PostgreSQL: use drizzle ORM
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
    return handleApiError(error);
  }
}
