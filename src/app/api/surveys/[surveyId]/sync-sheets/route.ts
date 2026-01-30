import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions, responses, ensureDbReady } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import { google } from "googleapis";
import { z } from "zod";

const syncSheetsSchema = z.object({
  spreadsheetId: z.string().optional(),
  sheetName: z.string().optional(),
});

export async function POST(
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

  try {
    const body = await request.json();
    const validated = syncSheetsSchema.parse(body);

    // Use provided config or stored config
    const spreadsheetId = validated.spreadsheetId || survey.sheetsConfig?.spreadsheetId;
    const sheetName = validated.sheetName || survey.sheetsConfig?.sheetName || "Survey Responses";

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "No spreadsheet ID configured" },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Google Sheets API not configured" },
        { status: 500 }
      );
    }

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

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

    // Prepare data
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

    // Clear existing data and write new data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers, ...rows],
      },
    });

    // Update survey with sheets config if changed
    if (validated.spreadsheetId || validated.sheetName) {
      await db
        .update(surveys)
        .set({
          sheetsConfig: { spreadsheetId, sheetName },
          updatedAt: new Date(),
        })
        .where(eq(surveys.id, surveyId));
    }

    return NextResponse.json({
      success: true,
      syncedCount: surveyResponses.length,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
  } catch (error) {
    console.error("Sheets sync error:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to sync with Google Sheets" },
      { status: 500 }
    );
  }
}
