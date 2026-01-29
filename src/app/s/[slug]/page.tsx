import { notFound } from "next/navigation";
import { SurveyContainer } from "@/components/respondent/survey-container";

interface SurveyData {
  id: string;
  title: string;
  theme: "light" | "dark" | "minimal";
  logoBase64: string | null;
  questions: Array<{
    id: string;
    type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating";
    title: string;
    options: string[] | null;
    required: boolean;
    order: number;
  }>;
}

async function getSurvey(slug: string): Promise<SurveyData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${baseUrl}/api/public/surveys/${slug}`, {
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getSurvey(slug);

  if (!survey) {
    notFound();
  }

  return (
    <div
      className="min-h-screen survey-container"
      data-survey-theme={survey.theme}
    >
      <div className="container max-w-3xl mx-auto py-12 px-4">
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
