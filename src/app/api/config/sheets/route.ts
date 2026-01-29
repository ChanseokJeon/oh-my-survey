import { NextResponse } from "next/server";

export async function GET() {
  const serviceAccountEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || null;
  const hasPrivateKey = !!process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const configured = !!(serviceAccountEmail && hasPrivateKey);

  return NextResponse.json({
    serviceAccountEmail,
    configured,
  });
}
