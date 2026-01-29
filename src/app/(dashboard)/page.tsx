"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SurveyCard } from "@/components/survey/survey-card";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Survey {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "closed";
  theme: string;
  questionCount: number;
  responseCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSurveys();
  }, []);

  async function fetchSurveys() {
    try {
      const response = await fetch("/api/surveys");
      if (!response.ok) throw new Error("Failed to fetch surveys");
      const data = await response.json();
      setSurveys(data.surveys);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load surveys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this survey?")) return;

    try {
      const response = await fetch(`/api/surveys/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete survey");
      setSurveys(surveys.filter((s) => s.id !== id));
      toast({ title: "Survey deleted" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground">
            Create and manage your surveys
          </p>
        </div>
        <Button asChild>
          <Link href="/surveys/new">
            <Plus className="mr-2 h-4 w-4" />
            New Survey
          </Link>
        </Button>
      </div>

      {surveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">No surveys yet</p>
          <Button asChild>
            <Link href="/surveys/new">
              <Plus className="mr-2 h-4 w-4" />
              Create your first survey
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={{
                ...survey,
                createdAt: new Date(survey.createdAt),
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
