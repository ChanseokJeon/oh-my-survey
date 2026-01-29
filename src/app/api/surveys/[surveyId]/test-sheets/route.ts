import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { google } from "googleapis";
import { z } from "zod";

const testSheetsSchema = z.object({
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  // Require authentication
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
    const validated = testSheetsSchema.parse(body);

    // Check environment variables
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets API not configured. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY environment variables."
        },
        { status: 500 }
      );
    }

    // Initialize Google Sheets API
    const googleAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth: googleAuth });

    // Try to get spreadsheet metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: validated.spreadsheetId,
    });

    return NextResponse.json({
      success: true,
      title: spreadsheet.data.properties?.title,
    });
  } catch (error) {
    console.error("Test sheets error:", error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || "Invalid input"
        },
        { status: 400 }
      );
    }

    // Handle Google API errors
    if (error && typeof error === "object" && "code" in error) {
      const googleError = error as { code?: number; message?: string };

      if (googleError.code === 404) {
        return NextResponse.json({
          success: false,
          error: "Spreadsheet not found. Please verify the Spreadsheet ID is correct.",
        });
      }

      if (googleError.code === 403) {
        return NextResponse.json({
          success: false,
          error: "Permission denied. Please share the spreadsheet with the service account email.",
        });
      }

      if (googleError.code === 401) {
        return NextResponse.json({
          success: false,
          error: "Authentication failed. Please check your Google Sheets API credentials.",
        });
      }

      return NextResponse.json({
        success: false,
        error: googleError.message || "Failed to access Google Sheets",
      });
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test spreadsheet connection"
      },
      { status: 500 }
    );
  }
}
