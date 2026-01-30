import { db } from "@/lib/db";
import { surveys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function verifySurveyOwnership(surveyId: string, userId: string) {
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
