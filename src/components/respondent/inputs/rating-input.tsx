"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function RatingInput({ value, onChange }: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          onMouseEnter={() => setHoverValue(rating)}
          onMouseLeave={() => setHoverValue(0)}
          className="p-2 transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "w-10 h-10 transition-colors",
              (hoverValue || value) >= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}
