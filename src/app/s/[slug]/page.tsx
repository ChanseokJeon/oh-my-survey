import { notFound } from "next/navigation";
import { SurveyContainer } from "@/components/respondent/survey-container";
import { db, surveys, questions, ensureDbReady, currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

// ISR: cache published surveys for 60s. Preview requests call auth() which
// triggers dynamic rendering, automatically bypassing this cache.
export const revalidate = 60;

interface SurveyData {
  id: string;
  title: string;
  theme: "light" | "dark" | "minimal" | "custom";
  customTheme?: {
    colors: {
      surveyBg: string;
      surveyBgRaw?: string;
      surveyFg: string;
      surveyPrimary: string;
      surveyPrimaryFg: string;
      surveyMuted: string;
      surveyMutedFg: string;
      surveyBorder: string;
      surveyInput: string;
      surveyCard: string;
      surveyCardFg: string;
    };
  };
  logoBase64: string | null;
  language: "en" | "ko";
  questions: Array<{
    id: string;
    type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating";
    title: string;
    options: string[] | null;
    required: boolean;
    order: number;
  }>;
}

function getCustomThemeStyles(customTheme?: SurveyData['customTheme']): React.CSSProperties {
  if (!customTheme?.colors) return {};

  const { colors } = customTheme;
  const styles: Record<string, string> = {
    '--survey-bg': colors.surveyBg,
    '--survey-fg': colors.surveyFg,
    '--survey-primary': colors.surveyPrimary,
    '--survey-primary-fg': colors.surveyPrimaryFg,
    '--survey-muted': colors.surveyMuted,
    '--survey-muted-fg': colors.surveyMutedFg,
    '--survey-border': colors.surveyBorder,
    '--survey-input': colors.surveyInput,
    '--survey-card': colors.surveyCard,
    '--survey-card-fg': colors.surveyCardFg,
  };

  if (colors.surveyBgRaw) {
    styles['--survey-bg-raw'] = colors.surveyBgRaw;
  }

  return styles as React.CSSProperties;
}

async function getSurvey(
  slug: string,
  isPreview: boolean = false
): Promise<SurveyData | null> {
  await ensureDbReady();

  // For PGlite, use raw SQL to avoid drizzle-orm compatibility issues
  if (currentProvider === 'pglite') {
    const pglite = getPGliteInstance();
    if (!pglite) {
      return null;
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
      return null;
    }

    const surveyRow = surveyResult.rows[0];

    // For preview mode, verify ownership
    if (isPreview && surveyRow.status === "draft") {
      const session = await auth();
      if (!session?.user?.id) {
        return null;
      }
      const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
      if (surveyRow.user_id !== actualUserId) {
        return null;
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
    let customTheme: SurveyData['customTheme'] = undefined;
    if (surveyRow.custom_theme) {
      try {
        customTheme = typeof surveyRow.custom_theme === 'string'
          ? JSON.parse(surveyRow.custom_theme)
          : surveyRow.custom_theme;
      } catch {
        customTheme = undefined;
      }
    }

    return {
      id: surveyRow.id,
      title: surveyRow.title,
      theme: surveyRow.theme as "light" | "dark" | "minimal" | "custom",
      customTheme,
      language: surveyRow.language as "en" | "ko",
      logoBase64: surveyRow.logo_base64,
      questions: questionsResult.rows.map(q => ({
        ...q,
        type: q.type as "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating",
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
      })),
    };
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
    return null;
  }

  // For preview mode, verify ownership using server-side session
  if (isPreview && survey.status === "draft") {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    // Resolve actual user ID for PGlite compatibility
    const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;

    if (survey.userId !== actualUserId) {
      return null;
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

  return {
    id: survey.id,
    title: survey.title,
    theme: survey.theme,
    customTheme: survey.customTheme ?? undefined,
    language: survey.language,
    logoBase64: survey.logoBase64,
    questions: surveyQuestions,
  };
}

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";

  const survey = await getSurvey(slug, isPreview);

  if (!survey) {
    notFound();
  }

  return (
    <div
      className="min-h-screen survey-container"
      data-survey-theme={survey.theme}
      style={survey.theme === "custom" ? getCustomThemeStyles(survey.customTheme) : undefined}
    >
      <div className="container max-w-3xl mx-auto py-12">
        {isPreview && (
          <div className="mb-6 p-3 bg-warning/20 border border-warning/40 rounded-md text-center">
            <p className="text-sm font-medium text-warning-foreground">
              Preview Mode - This is a draft survey
            </p>
          </div>
        )}
        {survey.logoBase64 && (
          <div className="flex justify-center mb-8">
            <img
              src={survey.logoBase64}
              alt="Survey logo"
              className="max-h-16 object-contain"
            />
          </div>
        )}
        <h1 className="text-3xl font-bold text-center mb-12">{survey.title}</h1>
        <SurveyContainer survey={survey} slug={slug} />
      </div>
    </div>
  );
}
