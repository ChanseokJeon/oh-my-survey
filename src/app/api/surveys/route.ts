import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions, responses } from "@/lib/db";
import { eq, desc, count } from "drizzle-orm";
import { createSurveySchema } from "@/lib/validations/survey";
import { generateSlug } from "@/lib/utils/slug";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const body = await request.json();
    const validated = createSurveySchema.parse(body);

    const [newSurvey] = await db
      .insert(surveys)
      .values({
        userId: session.user.id,
        title: validated.title,
        slug: generateSlug(validated.title),
        theme: validated.theme,
      })
      .returning();

    return NextResponse.json(newSurvey, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
  }
}
