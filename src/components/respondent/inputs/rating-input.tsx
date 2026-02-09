"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";
import { useKeyboardSelect } from "@/hooks/use-keyboard-select";

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

const RATINGS = [1, 2, 3, 4, 5];

export function RatingInput({ value, onChange }: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const selectedIndex = value > 0 ? value - 1 : -1;

  const { focusedIndex, getItemProps, containerProps } = useKeyboardSelect({
    itemCount: 5,
    selectedIndex,
    onSelect: (index) => onChange(RATINGS[index]),
  });

  return (
    <div className="flex justify-center gap-2" {...containerProps}>
      {RATINGS.map((rating, index) => {
        const itemProps = getItemProps(index);
        return (
          <button
            key={rating}
            type="button"
            ref={itemProps.ref}
            tabIndex={itemProps.tabIndex}
            role={itemProps.role}
            aria-checked={itemProps["aria-checked"]}
            aria-label={`${rating} star`}
            onKeyDown={itemProps.onKeyDown}
            onClick={() => onChange(rating)}
            onMouseEnter={() => setHoverValue(rating)}
            onMouseLeave={() => setHoverValue(0)}
            className={cn(
              "p-2 transition-transform hover:scale-110",
              "focus:outline-none focus:scale-110",
              index === focusedIndex && "ring-2 ring-primary/50 rounded-lg"
            )}
          >
            <Star
              className={cn(
                "w-10 h-10 transition-colors",
                (hoverValue || value) >= rating
                  ? "fill-warning text-warning"
                  : "text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
