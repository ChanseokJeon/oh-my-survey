import { NextResponse } from "next/server";
import { db, surveys, questions, ensureDbReady, currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await ensureDbReady();
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get("preview") === "true";

  // For PGlite, use raw SQL to avoid drizzle-orm compatibility issues
  if (currentProvider === 'pglite') {
    const pglite = getPGliteInstance();
    if (!pglite) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    // Find survey by slug
    const surveyQuery = isPreview
      ? `SELECT * FROM surveys WHERE slug = $1 LIMIT 1`
      : `SELECT * FROM surveys WHERE slug = $1 AND status = 'published' LIMIT 1`;
    const surveyResult = await pglite.query<{
      id: string;
      user_id: string;
      title: string;
      theme: string;
      custom_theme: string | null;
      language: string;
      logo_base64: string | null;
      status: string;
    }>(surveyQuery, [slug]);

    if (surveyResult.rows.length === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const surveyRow = surveyResult.rows[0];

    // For preview mode, verify ownership
    if (isPreview && surveyRow.status === "draft") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
      if (surveyRow.user_id !== actualUserId) {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 });
      }
    }

    // Get questions
    const questionsResult = await pglite.query<{
      id: string;
      type: string;
      title: string;
      options: string | null;
      required: boolean;
      order: number;
    }>(
      `SELECT id, type, title, options, required, "order" FROM questions WHERE survey_id = $1 ORDER BY "order" ASC`,
      [surveyRow.id]
    );

    // Parse customTheme if it's a string
    let customTheme = null;
    if (surveyRow.custom_theme) {
      try {
        customTheme = typeof surveyRow.custom_theme === 'string'
          ? JSON.parse(surveyRow.custom_theme)
          : surveyRow.custom_theme;
      } catch {
        customTheme = null;
      }
    }

    return NextResponse.json({
      id: surveyRow.id,
      title: surveyRow.title,
      theme: surveyRow.theme,
      customTheme,
      language: surveyRow.language,
      logoBase64: surveyRow.logo_base64,
      questions: questionsResult.rows.map(q => ({
        ...q,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
      })),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  // PostgreSQL: use drizzle ORM
  // Find survey by slug
  const [survey] = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      theme: surveys.theme,
      customTheme: surveys.customTheme,
      language: surveys.language,
      logoBase64: surveys.logoBase64,
      status: surveys.status,
      userId: surveys.userId,
    })
    .from(surveys)
    .where(
      isPreview
        ? eq(surveys.slug, slug)
        : and(eq(surveys.slug, slug), eq(surveys.status, "published"))
    );

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // For preview mode, verify ownership using server-side session
  if (isPreview && survey.status === "draft") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve actual user ID for PGlite compatibility
    const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;

    if (survey.userId !== actualUserId) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
  }

  // Get questions
  const surveyQuestions = await db
    .select({
      id: questions.id,
      type: questions.type,
      title: questions.title,
      options: questions.options,
      required: questions.required,
      order: questions.order,
    })
    .from(questions)
    .where(eq(questions.surveyId, survey.id))
    .orderBy(asc(questions.order));

  return NextResponse.json({
    id: survey.id,
    title: survey.title,
    theme: survey.theme,
    customTheme: survey.customTheme,
    language: survey.language,
    logoBase64: survey.logoBase64,
    questions: surveyQuestions,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
