"use client";

import { useSurveyTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";
import { themes } from "@/constants/themes";

export function ThemeSelector() {
  const { theme, setTheme } = useSurveyTheme();

  return (
    <div className="grid grid-cols-3 gap-4">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary",
            theme === t.id ? "border-primary ring-2 ring-primary/20" : "border-muted"
          )}
        >
          <div
            className={cn(
              "h-12 w-full rounded-md border",
              t.preview
            )}
          />
          <span className="font-medium">{t.name}</span>
          <span className="text-xs text-muted-foreground">{t.description}</span>
        </button>
      ))}
    </div>
  );
}
