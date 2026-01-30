import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Session } from "next-auth";

export interface AuthenticatedRequest {
  session: Session;
  userId: string;
}

export function withAuth<T>(
  handler: (
    request: Request,
    context: { params: Promise<T> },
    auth: AuthenticatedRequest
  ) => Promise<NextResponse>
) {
  return async (request: Request, context: { params: Promise<T> }) => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, context, { session, userId: session.user.id });
  };
}
