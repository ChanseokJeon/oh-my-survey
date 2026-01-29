"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Type, AlignLeft, List, ToggleLeft, Star } from "lucide-react";

const questionTypes = [
  {
    type: "short_text" as const,
    label: "Short Text",
    description: "Single line text input",
    icon: Type,
  },
  {
    type: "long_text" as const,
    label: "Long Text",
    description: "Multi-line text input",
    icon: AlignLeft,
  },
  {
    type: "multiple_choice" as const,
    label: "Multiple Choice",
    description: "Select one option",
    icon: List,
  },
  {
    type: "yes_no" as const,
    label: "Yes / No",
    description: "Simple yes or no",
    icon: ToggleLeft,
  },
  {
    type: "rating" as const,
    label: "Rating",
    description: "1-5 star rating",
    icon: Star,
  },
];

interface QuestionTypePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating") => void;
}

export function QuestionTypePicker({
  open,
  onOpenChange,
  onSelect,
}: QuestionTypePickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Question</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {questionTypes.map((qt) => (
            <Button
              key={qt.type}
              variant="outline"
              className="flex items-center justify-start gap-3 h-auto py-3"
              onClick={() => {
                onSelect(qt.type);
                onOpenChange(false);
              }}
            >
              <qt.icon className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{qt.label}</div>
                <div className="text-xs text-muted-foreground">
                  {qt.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
