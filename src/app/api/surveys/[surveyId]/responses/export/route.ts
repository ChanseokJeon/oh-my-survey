import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions, responses, ensureDbReady } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

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
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, session.user.id)));

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
  const headers = [
    "Response ID",
    "Submitted At",
    "IP Address",
    ...surveyQuestions.map((q) => q.title),
  ];

  const rows = surveyResponses.map((response) => {
    const answers = response.answersJson as Record<string, unknown>;
    return [
      response.id,
      response.completedAt.toISOString(),
      response.ipAddress || "",
      ...surveyQuestions.map((q) => {
        const answer = answers[q.id];
        if (Array.isArray(answer)) {
          return answer.join("; ");
        }
        return String(answer ?? "");
      }),
    ];
  });

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
