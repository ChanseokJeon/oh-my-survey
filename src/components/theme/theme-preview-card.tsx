"use client";

import { CustomThemeData } from "@/lib/theme/types";
import { Card, CardContent } from "@/components/ui/card";

interface ThemePreviewCardProps {
  theme: CustomThemeData;
}

export function ThemePreviewCard({ theme }: ThemePreviewCardProps) {
  const { colors, meta } = theme;

  return (
    <div className="space-y-4">
      {/* Extracted Palette */}
      {meta.extractedPalette && meta.extractedPalette.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Extracted Colors</h4>
          <div className="flex gap-2 flex-wrap">
            {meta.extractedPalette.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-12 h-12 rounded-md border shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme Preview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Theme Preview</h4>
        <Card className="border-2">
          <CardContent className="p-6">
            <div
              className="space-y-4 rounded-lg p-6 border"
              style={{
                backgroundColor: `hsl(${colors.surveyBg})`,
                color: `hsl(${colors.surveyFg})`,
                borderColor: `hsl(${colors.surveyBorder})`,
              }}
            >
              <div className="space-y-2">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: `hsl(${colors.surveyFg})` }}
                >
                  Survey Preview
                </h3>
                <p
                  className="text-sm"
                  style={{ color: `hsl(${colors.surveyMutedFg})` }}
                >
                  This is how your survey will look with this theme
                </p>
              </div>

              <div
                className="p-4 rounded-md"
                style={{
                  backgroundColor: `hsl(${colors.surveyCard})`,
                  color: `hsl(${colors.surveyCardFg})`,
                }}
              >
                <p className="text-sm">Question card</p>
              </div>

              <button
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: `hsl(${colors.surveyPrimary})`,
                  color: `hsl(${colors.surveyPrimaryFg})`,
                }}
              >
                Submit Button
              </button>

              <div
                className="p-3 rounded-md text-sm"
                style={{
                  backgroundColor: `hsl(${colors.surveyMuted})`,
                  color: `hsl(${colors.surveyMutedFg})`,
                }}
              >
                Muted background element
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Color Details */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Theme Colors</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <ColorSwatch label="Background" hsl={colors.surveyBg} />
          <ColorSwatch label="Foreground" hsl={colors.surveyFg} />
          <ColorSwatch label="Primary" hsl={colors.surveyPrimary} />
          <ColorSwatch label="Primary Text" hsl={colors.surveyPrimaryFg} />
          <ColorSwatch label="Muted" hsl={colors.surveyMuted} />
          <ColorSwatch label="Muted Text" hsl={colors.surveyMutedFg} />
          <ColorSwatch label="Border" hsl={colors.surveyBorder} />
          <ColorSwatch label="Input" hsl={colors.surveyInput} />
          <ColorSwatch label="Card" hsl={colors.surveyCard} />
          <ColorSwatch label="Card Text" hsl={colors.surveyCardFg} />
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ label, hsl }: { label: string; hsl: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded border shadow-sm flex-shrink-0"
        style={{ backgroundColor: `hsl(${hsl})` }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{label}</div>
        <div className="text-muted-foreground font-mono text-xs truncate">
          {hsl}
        </div>
      </div>
    </div>
  );
}
