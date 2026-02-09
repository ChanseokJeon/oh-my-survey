"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Question } from "@/types/question";
import { getQuestionTypeIcon, getQuestionTypeLabel } from "@/constants/question-types";

interface QuestionItemProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
}

export function QuestionItem({ question, onEdit, onDelete }: QuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = getQuestionTypeIcon(question.type);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-4",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        className="cursor-grab touch-none"
        aria-label="질문 순서 변경"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {getQuestionTypeLabel(question.type)}
          </span>
          {question.required && (
            <Badge variant="secondary" className="text-xs">Required</Badge>
          )}
        </div>
        <p className="font-medium truncate">{question.title}</p>
        {question.type === "multiple_choice" && question.options && (
          <p className="text-sm text-muted-foreground truncate">
            {question.options.length} options
          </p>
        )}
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(question)} aria-label="질문 편집">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(question.id)}
          aria-label="질문 삭제"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
