import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { SurveyContainer } from "@/components/respondent/survey-container";

interface SurveyData {
  id: string;
  title: string;
  theme: "light" | "dark" | "minimal";
  logoBase64: string | null;
  language: "en" | "ko";
  questions: Array<{
    id: string;
    type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating";
    title: string;
    options: string[] | null;
    required: boolean;
    order: number;
  }>;
}

async function getSurvey(
  slug: string,
  isPreview: boolean = false,
  userId?: string
): Promise<SurveyData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const url = new URL(`${baseUrl}/api/public/surveys/${slug}`);
    if (isPreview && userId) {
      url.searchParams.set("preview", "true");
      url.searchParams.set("userId", userId);
    }
    const response = await fetch(url.toString(), {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";

  const session = await auth();
  const survey = await getSurvey(slug, isPreview, session?.user?.id);

  if (!survey) {
    notFound();
  }

  return (
    <div
      className="min-h-screen survey-container"
      data-survey-theme={survey.theme}
    >
      <div className="container max-w-3xl mx-auto py-12 px-4">
        {isPreview && (
          <div className="mb-6 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-md text-center">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Preview Mode - This is a draft survey
            </p>
          </div>
        )}
        {survey.logoBase64 && (
          <div className="flex justify-center mb-8">
            <img
              src={survey.logoBase64}
              alt="Survey logo"
              className="max-h-16 object-contain"
            />
          </div>
        )}
        <h1 className="text-3xl font-bold text-center mb-12">{survey.title}</h1>
        <SurveyContainer survey={survey} slug={slug} />
      </div>
    </div>
  );
}
