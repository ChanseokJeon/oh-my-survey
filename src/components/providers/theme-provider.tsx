"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CustomThemeData, THEME_KEY_TO_CSS_VAR, ALLOWED_CSS_VARS, ThemeColors } from "@/lib/theme/types";

type SurveyTheme = "light" | "dark" | "minimal" | "custom";

interface ThemeContextType {
  theme: SurveyTheme;
  customTheme: CustomThemeData | null;
  setTheme: (theme: SurveyTheme) => void;
  setCustomTheme: (customTheme: CustomThemeData | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  defaultCustomTheme = null,
}: {
  children: React.ReactNode;
  defaultTheme?: SurveyTheme;
  defaultCustomTheme?: CustomThemeData | null;
}) {
  const [theme, setTheme] = useState<SurveyTheme>(defaultTheme);
  const [customTheme, setCustomTheme] = useState<CustomThemeData | null>(defaultCustomTheme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "custom" && customTheme) {
      // Custom theme: set attribute + inject CSS variables
      root.setAttribute("data-survey-theme", "custom");

      Object.entries(customTheme.colors).forEach(([key, value]) => {
        const cssVar = THEME_KEY_TO_CSS_VAR[key as keyof ThemeColors];
        if (cssVar && ALLOWED_CSS_VARS.includes(cssVar as any)) {
          root.style.setProperty(cssVar, value);
        }
      });
    } else {
      // Preset theme: use CSS file
      root.setAttribute("data-survey-theme", theme);

      // Clear custom CSS variables
      ALLOWED_CSS_VARS.forEach((cssVar) => {
        root.style.removeProperty(cssVar);
      });
    }
  }, [theme, customTheme]);

  return (
    <ThemeContext.Provider value={{ theme, customTheme, setTheme, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useSurveyTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useSurveyTheme must be used within a ThemeProvider");
  }
  return context;
}
