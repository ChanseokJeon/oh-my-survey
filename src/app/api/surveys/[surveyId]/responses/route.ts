import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, responses, ensureDbReady } from "@/lib/db";
import { eq, desc, count } from "drizzle-orm";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

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
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

  // Verify survey ownership
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
  const survey = await verifySurveyOwnership(surveyId, actualUserId);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Get total count
  const [totalCount] = await db
    .select({ count: count() })
    .from(responses)
    .where(eq(responses.surveyId, surveyId));

  const total = totalCount?.count ?? 0;

  // Get paginated responses
  const surveyResponses = await db
    .select()
    .from(responses)
    .where(eq(responses.surveyId, surveyId))
    .orderBy(desc(responses.completedAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    responses: surveyResponses.map((r) => ({
      id: r.id,
      answers: r.answersJson,
      completedAt: r.completedAt,
      ipAddress: r.ipAddress,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
