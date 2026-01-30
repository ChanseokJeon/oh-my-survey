import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === "development"
      ? error.message
      : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
