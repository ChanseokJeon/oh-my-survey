import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, ensureDbReady, currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";
import { eq, desc, sql } from "drizzle-orm";
import { createSurveySchema } from "@/lib/validations/survey";
import { generateSlug } from "@/lib/utils/slug";
import { handleApiError } from "@/lib/utils/api-error";
import { resolveUserIdForPGlite, getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  // Resolve actual user ID for PGlite (may differ from session ID)
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;

  const userSurveys = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      slug: surveys.slug,
      status: surveys.status,
      theme: surveys.theme,
      createdAt: surveys.createdAt,
      updatedAt: surveys.updatedAt,
      questionCount: sql<number>`(SELECT COUNT(*) FROM questions WHERE questions.survey_id = ${surveys.id})`.as('question_count'),
      responseCount: sql<number>`(SELECT COUNT(*) FROM responses WHERE responses.survey_id = ${surveys.id})`.as('response_count'),
    })
    .from(surveys)
    .where(eq(surveys.userId, actualUserId))
    .orderBy(desc(surveys.createdAt));

  return NextResponse.json({ surveys: userSurveys });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();
  try {
    const body = await request.json();
    const validated = createSurveySchema.parse(body);

    const slug = generateSlug(validated.title);
    const theme = validated.theme || 'light';

    // Resolve actual user ID (for PGlite multi-process compatibility)
    const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;

    // For PGlite, use raw SQL due to drizzle-orm/pglite insert compatibility issues
    if (currentProvider === 'pglite') {
      const pglite = getPGliteInstance();
      if (!pglite) {
        throw new Error('PGlite instance not available');
      }

      // Ensure user exists in this PGlite instance (handles multi-process isolation)
      const resolvedUserId = await resolveUserIdForPGlite(session.user.id, session.user.email);
      if (!resolvedUserId) {
        return NextResponse.json(
          { error: "Session invalid. Please refresh the page and try again." },
          { status: 401 }
        );
      }

      const result = await pglite.query(
        `INSERT INTO surveys (user_id, title, slug, theme, language)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, title, slug, status, theme, language, logo_base64, sheets_config, created_at, updated_at`,
        [resolvedUserId, validated.title, slug, theme, 'ko']
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    }

    // PostgreSQL: use drizzle ORM
    const [newSurvey] = await db
      .insert(surveys)
      .values({
        userId: actualUserId,
        title: validated.title,
        slug: slug,
        theme: theme,
      })
      .returning();

    return NextResponse.json(newSurvey, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
