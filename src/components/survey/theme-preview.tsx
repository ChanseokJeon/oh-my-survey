"use client";

interface ThemePreviewProps {
  theme: "light" | "dark" | "minimal";
  logo: string | null;
}

export function ThemePreview({ theme, logo }: ThemePreviewProps) {
  return (
    <div
      className="survey-container border rounded-lg p-6 space-y-6"
      data-survey-theme={theme}
      style={{
        backgroundColor: `hsl(var(--survey-bg))`,
        color: `hsl(var(--survey-fg))`,
        borderColor: `hsl(var(--survey-border))`,
      }}
    >
      {/* Logo */}
      {logo && (
        <div className="flex justify-center mb-4">
          <img
            src={logo}
            alt="Survey logo"
            className="max-h-12 object-contain"
          />
        </div>
      )}

      {/* Sample Question */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3
            className="text-lg font-semibold"
            style={{ color: `hsl(var(--survey-fg))` }}
          >
            How satisfied are you?
            <span style={{ color: `hsl(var(--survey-primary))` }}> *</span>
          </h3>
        </div>

        {/* Sample Multiple Choice Options */}
        <div className="space-y-2">
          {["Very satisfied", "Satisfied", "Neutral", "Unsatisfied"].map(
            (option, index) => (
              <button
                key={index}
                className="w-full p-3 rounded-lg border text-left transition-colors hover:opacity-80"
                style={{
                  backgroundColor: `hsl(var(--survey-card))`,
                  borderColor: `hsl(var(--survey-border))`,
                  color: `hsl(var(--survey-card-fg))`,
                }}
                disabled
              >
                {option}
              </button>
            )
          )}
        </div>
      </div>

      {/* Navigation Buttons Preview */}
      <div className="flex justify-between pt-4">
        <button
          className="px-4 py-2 rounded-md border transition-colors"
          style={{
            borderColor: `hsl(var(--survey-border))`,
            color: `hsl(var(--survey-muted-fg))`,
          }}
          disabled
        >
          Previous
        </button>
        <button
          className="px-4 py-2 rounded-md transition-colors"
          style={{
            backgroundColor: `hsl(var(--survey-primary))`,
            color: `hsl(var(--survey-primary-fg))`,
          }}
          disabled
        >
          Next
        </button>
      </div>
    </div>
  );
}
