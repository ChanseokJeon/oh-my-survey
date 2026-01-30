import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, questions, responses, ensureDbReady } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { buildResponseHeaders, buildResponseRows } from "@/lib/utils/response-formatter";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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

  // Get questions for headers
  const surveyQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(asc(questions.order));

  // Get all responses
  const surveyResponses = await db
    .select()
    .from(responses)
    .where(eq(responses.surveyId, surveyId))
    .orderBy(asc(responses.completedAt));

  // Build CSV
  const headers = buildResponseHeaders(surveyQuestions);
  const rows = buildResponseRows(surveyResponses, surveyQuestions);

  const csvContent = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(",")),
  ].join("\n");

  const filename = `${survey.slug}-responses-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
