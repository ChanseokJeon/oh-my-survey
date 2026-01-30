"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPES } from "@/constants/question-types";
import { QuestionType } from "@/types/question";

interface QuestionTypePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: QuestionType) => void;
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
          {QUESTION_TYPES.map((qt) => (
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
