import { db, currentProvider } from "@/lib/db";
import { getPGliteInstance } from "@/lib/db/providers";
import { surveys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function verifySurveyOwnership(surveyId: string, userId: string) {
  // For PGlite, use raw SQL to avoid drizzle-orm compatibility issues with and()
  if (currentProvider === 'pglite') {
    const pglite = getPGliteInstance();
    if (!pglite) return null;

    const result = await pglite.query<{
      id: string;
      user_id: string;
      title: string;
      slug: string;
      status: string;
      theme: string;
      language: string;
      logo_base64: string | null;
      sheets_config: unknown;
      custom_theme: unknown;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM surveys WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [surveyId, userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      slug: row.slug,
      status: row.status as 'draft' | 'published' | 'closed',
      theme: row.theme as 'light' | 'dark' | 'minimal' | 'custom',
      language: row.language as 'en' | 'ko',
      logoBase64: row.logo_base64,
      sheetsConfig: row.sheets_config as { spreadsheetId: string; sheetName: string } | null,
      customTheme: row.custom_theme,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // PostgreSQL: use drizzle ORM
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, userId)));

  return survey || null;
}

export async function getSurveyBySlug(slug: string) {
  const [survey] = await db
    .select()
    .from(surveys)
    .where(eq(surveys.slug, slug));

  return survey || null;
}
