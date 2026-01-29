"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeProvider, useSurveyTheme } from "@/components/providers/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useSurvey } from "@/contexts/survey-context";
import { Loader2, Trash2, Upload, ExternalLink, Wand2 } from "lucide-react";
import { SheetsSetupWizard } from "@/components/survey/sheets-setup-wizard";

export default function SettingsPage() {
  const { survey, refreshSurvey } = useSurvey();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "minimal">("light");
  const [logo, setLogo] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setTheme(survey.theme as "light" | "dark" | "minimal");
      setLogo(survey.logoBase64);
      setSpreadsheetId((survey.sheetsConfig as any)?.spreadsheetId || "");
      setSheetName((survey.sheetsConfig as any)?.sheetName || "");
    }
  }, [survey]);

  async function handleSave() {
    if (!survey) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/surveys/${survey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          theme,
          logoBase64: logo,
          sheetsConfig: spreadsheetId
            ? { spreadsheetId, sheetName: sheetName || "Survey Responses" }
            : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
      toast({ title: "Settings saved" });
      await refreshSurvey();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(action: "publish" | "unpublish" | "close") {
    if (!survey) return;

    setPublishing(true);
    try {
      const response = await fetch(`/api/surveys/${survey.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed");
      }
      toast({ title: `Survey ${action}ed` });
      await refreshSurvey();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!survey) return;
    if (!confirm("Are you sure you want to delete this survey? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/surveys/${survey.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");
      toast({ title: "Survey deleted" });
      router.push("/");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  if (!survey) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Theme</Label>
            <ThemeProvider defaultTheme={theme}>
              <ThemeSelectorWithCallback onThemeChange={setTheme} currentTheme={theme} />
            </ThemeProvider>
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {logo ? (
                <div className="relative">
                  <img src={logo} alt="Logo" className="h-16 object-contain" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setLogo(null)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-4 py-2 hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Max 2MB, PNG/JPG/SVG</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Sheets Integration</CardTitle>
          <CardDescription>
            Sync responses to a Google Spreadsheet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setWizardOpen(true)}
            className="w-full"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Setup with Wizard
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter manually
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
            <Input
              id="spreadsheetId"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="Enter Google Spreadsheet ID"
            />
            <p className="text-xs text-muted-foreground">
              Find this in the spreadsheet URL: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sheetName">Sheet Name (optional)</Label>
            <Input
              id="sheetName"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Survey Responses"
            />
          </div>
        </CardContent>
      </Card>

      <SheetsSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        surveyId={survey?.id || ""}
        onComplete={(config) => {
          setSpreadsheetId(config.spreadsheetId);
          setSheetName(config.sheetName);
          setWizardOpen(false);
          toast({ title: "Sheets configuration updated" });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Publish</CardTitle>
          <CardDescription>
            Control who can see and respond to your survey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {survey?.status === "published" && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200">
              <ExternalLink className="h-4 w-4 text-green-600" />
              <code className="text-sm flex-1 truncate">
                {typeof window !== "undefined" && `${window.location.origin}/s/${survey.slug}`}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/s/${survey.slug}`);
                  toast({ title: "Link copied" });
                }}
              >
                Copy
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            {survey?.status === "draft" && (
              <Button onClick={() => handlePublish("publish")} disabled={publishing}>
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish Survey
              </Button>
            )}
            {survey?.status === "published" && (
              <>
                <Button variant="outline" onClick={() => handlePublish("unpublish")} disabled={publishing}>
                  Unpublish
                </Button>
                <Button variant="outline" onClick={() => handlePublish("close")} disabled={publishing}>
                  Close Survey
                </Button>
              </>
            )}
            {survey?.status === "closed" && (
              <Button onClick={() => handlePublish("publish")} disabled={publishing}>
                Reopen Survey
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Survey
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function ThemeSelectorWithCallback({
  onThemeChange,
  currentTheme,
}: {
  onThemeChange: (theme: "light" | "dark" | "minimal") => void;
  currentTheme: string;
}) {
  const { setTheme } = useSurveyTheme();

  useEffect(() => {
    setTheme(currentTheme as "light" | "dark" | "minimal");
  }, [currentTheme, setTheme]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {(["light", "dark", "minimal"] as const).map((t) => (
        <button
          key={t}
          onClick={() => {
            setTheme(t);
            onThemeChange(t);
          }}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary ${
            currentTheme === t ? "border-primary ring-2 ring-primary/20" : "border-muted"
          }`}
        >
          <div
            className={`h-12 w-full rounded-md border ${
              t === "light"
                ? "bg-white border-gray-200"
                : t === "dark"
                ? "bg-gray-900 border-gray-700"
                : "bg-gray-50 border-gray-300"
            }`}
          />
          <span className="font-medium capitalize">{t}</span>
        </button>
      ))}
    </div>
  );
}
