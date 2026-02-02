import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureDbReady } from "@/lib/db";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";
import { handleApiError } from "@/lib/utils/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractThemeRequestSchema } from "@/lib/validations/theme";
import {
  validateImageUrl,
  validateImageFile,
  validateBase64Image,
} from "@/lib/theme/validators";
import { fetchImageFromUrl } from "@/lib/theme/fetcher";
import { extractColors } from "@/lib/theme/extractor";
import { generateTheme } from "@/lib/theme/generator";
import { extractWebsiteTheme } from "@/lib/theme/website";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  await ensureDbReady();

  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  // 2. Verify ownership
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
  const survey = await verifySurveyOwnership(surveyId, actualUserId);

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // 3. Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkRateLimit('extractTheme', actualUserId, ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter || 60),
        },
      }
    );
  }

  try {
    // 4. Validate request
    const body = await request.json();
    const validated = extractThemeRequestSchema.parse(body);

    let imageBuffer: Buffer;

    // 5. Process based on source type
    if (validated.source === 'url') {
      // Validate URL for SSRF
      const urlValidation = await validateImageUrl(validated.data);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: urlValidation.error || 'Invalid URL' },
          { status: 400 }
        );
      }

      // Fetch image
      try {
        imageBuffer = await fetchImageFromUrl(validated.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch image';
        return NextResponse.json({ error: message }, { status: 400 });
      }

      // Validate fetched file
      const fileValidation = await validateImageFile(imageBuffer);
      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: fileValidation.error || 'Invalid image' },
          { status: 400 }
        );
      }
    } else if (validated.source === 'base64') {
      // Validate base64 format
      const base64Validation = validateBase64Image(validated.data);
      if (!base64Validation.valid) {
        return NextResponse.json(
          { error: base64Validation.error || 'Invalid base64 image' },
          { status: 400 }
        );
      }

      // Extract base64 data
      const base64Data = validated.data.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');

      // Validate converted file
      const fileValidation = await validateImageFile(imageBuffer);
      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: fileValidation.error || 'Invalid image' },
          { status: 400 }
        );
      }
    } else if (validated.source === 'website') {
      try {
        const result = await extractWebsiteTheme(validated.data);
        return NextResponse.json({
          palette: result.palette,
          suggestedTheme: result.suggestedTheme,
          extractionSource: result.source,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to extract theme from website';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    } else {
      // source === 'file': data is already base64
      const base64Data = validated.data.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');

      // Validate file
      const fileValidation = await validateImageFile(imageBuffer);
      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: fileValidation.error || 'Invalid image' },
          { status: 400 }
        );
      }
    }

    // 6. Extract colors
    let palette: string[];
    try {
      palette = await extractColors(imageBuffer);
    } catch (error) {
      console.error('Color extraction failed:', error);
      return NextResponse.json(
        { error: 'Failed to extract colors from image' },
        { status: 500 }
      );
    }

    // 7. Generate theme
    const suggestedTheme = generateTheme(palette);

    // 8. Return response
    return NextResponse.json({
      palette,
      suggestedTheme,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
