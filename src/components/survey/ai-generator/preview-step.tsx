"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  ArrowLeft,
  Trash2,
  Check,
  GripVertical,
} from "lucide-react";
import type { EditableSurvey, EditableQuestion } from "./types";
import { getQuestionTypeLabel, getQuestionTypeColor } from "@/constants/question-types";

interface PreviewStepProps {
  survey: EditableSurvey;
  onSurveyChange: (survey: EditableSurvey) => void;
  isCreating: boolean;
  onRegenerate: () => void;
  onCreate: () => void;
}

export function PreviewStep({
  survey,
  onSurveyChange,
  isCreating,
  onRegenerate,
  onCreate,
}: PreviewStepProps) {
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const handleTitleChange = (newTitle: string) => {
    onSurveyChange({ ...survey, title: newTitle });
  };

  const handleQuestionTitleChange = (questionId: string, newTitle: string) => {
    onSurveyChange({
      ...survey,
      questions: survey.questions.map((q) =>
        q.id === questionId ? { ...q, title: newTitle } : q
      ),
    });
  };

  const handleQuestionRequiredChange = (questionId: string, required: boolean) => {
    onSurveyChange({
      ...survey,
      questions: survey.questions.map((q) =>
        q.id === questionId ? { ...q, required } : q
      ),
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    onSurveyChange({
      ...survey,
      questions: survey.questions.filter((q) => q.id !== questionId),
    });
  };

  const canCreate = survey.title.trim().length > 0 && survey.questions.length > 0;

  return (
    <div className="space-y-6">
      {/* Survey Title */}
      <div className="space-y-2">
        <Label htmlFor="survey-title">Survey Title</Label>
        <Input
          id="survey-title"
          value={survey.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          maxLength={200}
          disabled={isCreating}
        />
      </div>

      {/* Questions List */}
      <div className="space-y-2">
        <Label>Questions ({survey.questions.length})</Label>
        <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
          {survey.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isEditing={editingQuestionId === question.id}
              onStartEdit={() => setEditingQuestionId(question.id)}
              onEndEdit={() => setEditingQuestionId(null)}
              onTitleChange={(title) => handleQuestionTitleChange(question.id, title)}
              onRequiredChange={(required) =>
                handleQuestionRequiredChange(question.id, required)
              }
              onDelete={() => handleDeleteQuestion(question.id)}
              disabled={isCreating}
            />
          ))}
        </div>
        {survey.questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No questions. Click &ldquo;Regenerate&rdquo; to try again.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onRegenerate}
          disabled={isCreating}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Regenerate
        </Button>
        <Button
          onClick={onCreate}
          disabled={!canCreate || isCreating}
          className="flex-1"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Create Survey
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface QuestionCardProps {
  question: EditableQuestion;
  index: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onTitleChange: (title: string) => void;
  onRequiredChange: (required: boolean) => void;
  onDelete: () => void;
  disabled: boolean;
}

function QuestionCard({
  question,
  index,
  isEditing,
  onStartEdit,
  onEndEdit,
  onTitleChange,
  onRequiredChange,
  onDelete,
  disabled,
}: QuestionCardProps) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card">
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1 text-muted-foreground pt-1">
          <GripVertical className="h-4 w-4" />
          <span className="text-xs font-medium">{index + 1}</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={getQuestionTypeColor(question.type)}
            >
              {getQuestionTypeLabel(question.type)}
            </Badge>
            {question.required && (
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            )}
          </div>
          {isEditing ? (
            <Input
              value={question.title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onEndEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEndEdit();
              }}
              autoFocus
              maxLength={500}
              disabled={disabled}
            />
          ) : (
            <p
              className="text-sm cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
              onClick={onStartEdit}
            >
              {question.title}
            </p>
          )}
          {question.type === "multiple_choice" && question.options && (
            <div className="pl-2 space-y-1">
              {question.options.map((option, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full border flex-shrink-0" />
                  {option}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label htmlFor={`required-${question.id}`} className="text-xs text-muted-foreground sr-only">
              Required
            </Label>
            <Switch
              id={`required-${question.id}`}
              checked={question.required}
              onCheckedChange={onRequiredChange}
              disabled={disabled}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={disabled}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
