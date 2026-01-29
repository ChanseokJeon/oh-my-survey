"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSelector } from "@/components/survey/theme-selector";
import { ThemeProvider, useSurveyTheme } from "@/components/providers/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { AIGeneratorDialog } from "@/components/survey/ai-generator";

function ThemeSelectorWrapper({ onThemeChange }: { onThemeChange: (theme: "light" | "dark" | "minimal") => void }) {
  const { theme, setTheme } = useSurveyTheme();

  const handleChange = (newTheme: "light" | "dark" | "minimal") => {
    setTheme(newTheme);
    onThemeChange(newTheme);
  };

  return (
    <div onClick={() => {
      // Get current theme and cycle through options for click handling
      // ThemeSelector handles its own click events
    }}>
      <ThemeSelector />
    </div>
  );
}

export default function NewSurveyPage() {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "minimal">("light");
  const [loading, setLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, theme }),
      });

      if (!response.ok) throw new Error("Failed to create survey");

      const survey = await response.json();
      toast({ title: "Survey created!" });
      router.push(`/surveys/${survey.id}/edit`);
    } catch {
      toast({
        title: "Error",
        description: "Failed to create survey",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Survey</CardTitle>
          <CardDescription>
            Give your survey a name and choose a theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Survey Title</Label>
              <Input
                id="title"
                placeholder="Enter survey title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <ThemeProvider defaultTheme={theme}>
                <ThemeSelectorWrapper onThemeChange={setTheme} />
              </ThemeProvider>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !title.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Survey
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setAiDialogOpen(true)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Button>
          </form>
        </CardContent>
      </Card>

      <AIGeneratorDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onSurveyGenerated={(survey) => {
          router.push(`/surveys/${survey.id}/edit`);
        }}
      />
    </div>
  );
}
