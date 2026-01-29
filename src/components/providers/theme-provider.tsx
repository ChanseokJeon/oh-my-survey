"use client";

import { createContext, useContext, useEffect, useState } from "react";

type SurveyTheme = "light" | "dark" | "minimal";

interface ThemeContextType {
  theme: SurveyTheme;
  setTheme: (theme: SurveyTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode;
  defaultTheme?: SurveyTheme;
}) {
  const [theme, setTheme] = useState<SurveyTheme>(defaultTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-survey-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
