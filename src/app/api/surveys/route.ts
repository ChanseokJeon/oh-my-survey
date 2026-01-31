import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions, responses, ensureDbReady, currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";
import { eq, desc, count } from "drizzle-orm";
import { createSurveySchema } from "@/lib/validations/survey";
import { generateSlug } from "@/lib/utils/slug";
import { handleApiError } from "@/lib/utils/api-error";
import { resolveUserIdForPGlite } from "@/lib/utils/pglite-user";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();
  const userSurveys = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      slug: surveys.slug,
      status: surveys.status,
      theme: surveys.theme,
      createdAt: surveys.createdAt,
      updatedAt: surveys.updatedAt,
    })
    .from(surveys)
    .where(eq(surveys.userId, session.user.id))
    .orderBy(desc(surveys.createdAt));

  // Get counts for each survey
  const surveysWithCounts = await Promise.all(
    userSurveys.map(async (survey) => {
      const [questionCount] = await db
        .select({ count: count() })
        .from(questions)
        .where(eq(questions.surveyId, survey.id));

      const [responseCount] = await db
        .select({ count: count() })
        .from(responses)
        .where(eq(responses.surveyId, survey.id));

      return {
        ...survey,
        questionCount: questionCount?.count ?? 0,
        responseCount: responseCount?.count ?? 0,
      };
    })
  );

  return NextResponse.json({ surveys: surveysWithCounts });
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

    // For PGlite, use raw SQL due to drizzle-orm/pglite insert compatibility issues
    if (currentProvider === 'pglite') {
      const pglite = getPGliteInstance();
      if (!pglite) {
        throw new Error('PGlite instance not available');
      }

      // Ensure user exists in this PGlite instance (handles multi-process isolation)
      // Returns the actual user ID to use (may differ from session ID if email already exists)
      const actualUserId = await resolveUserIdForPGlite(session.user.id, session.user.email);
      if (!actualUserId) {
        return NextResponse.json(
          { error: "Session invalid. Please refresh the page and try again." },
          { status: 401 }
        );
      }

      const result = await pglite.query(
        `INSERT INTO surveys (user_id, title, slug, theme, language)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, title, slug, status, theme, language, logo_base64, sheets_config, created_at, updated_at`,
        [actualUserId, validated.title, slug, theme, 'ko']
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    }

    // PostgreSQL: use drizzle ORM
    const [newSurvey] = await db
      .insert(surveys)
      .values({
        userId: session.user.id,
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
