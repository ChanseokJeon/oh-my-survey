"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QuestionList } from "@/components/builder/question-list";
import { QuestionTypePicker } from "@/components/builder/question-type-picker";
import { QuestionEditor } from "@/components/builder/question-editor";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSurvey } from "@/contexts/survey-context";
import { Plus, Loader2 } from "lucide-react";

interface Question {
  id: string;
  type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating";
  title: string;
  options: string[] | null;
  required: boolean;
  order: number;
}

export default function EditSurveyPage() {
  const { survey, questions: contextQuestions, refreshSurvey } = useSurvey();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync questions with context
  useEffect(() => {
    if (contextQuestions.length > 0) {
      setQuestions(contextQuestions as Question[]);
    }
  }, [contextQuestions]);

  async function handleAddQuestion(type: Question["type"]) {
    if (!survey || isAdding) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/surveys/${survey.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: "New question",
          options: type === "multiple_choice" ? ["Option 1", "Option 2"] : undefined,
          required: false,
        }),
      });

      if (!response.ok) throw new Error("Failed to add question");
      const newQuestion = await response.json();
      setQuestions([...questions, newQuestion]);
      setEditingQuestion(newQuestion);
      toast({ title: "Question added" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add question",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  }

  async function handleReorder(questionIds: string[]) {
    if (!survey) return;

    const previousQuestions = [...questions];
    // Optimistic update
    const reordered = questionIds.map((id, index) => ({
      ...questions.find((q) => q.id === id)!,
      order: index + 1,
    }));
    setQuestions(reordered);

    try {
      const response = await fetch(`/api/surveys/${survey.id}/questions/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds }),
      });

      if (!response.ok) throw new Error("Failed to reorder");
    } catch {
      setQuestions(previousQuestions);
      toast({
        title: "Error",
        description: "Failed to reorder questions",
        variant: "destructive",
      });
    }
  }

  async function handleEditQuestion(updates: Partial<Question>) {
    if (!editingQuestion || !survey || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/surveys/${survey.id}/questions/${editingQuestion.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) throw new Error("Failed to update");
      const updated = await response.json();
      setQuestions(questions.map((q) => (q.id === updated.id ? updated : q)));
      toast({ title: "Question updated" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteClick(id: string) {
    setDeletingQuestionId(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDeleteQuestion() {
    if (!deletingQuestionId || !survey) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/surveys/${survey.id}/questions/${deletingQuestionId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");
      setQuestions(questions.filter((q) => q.id !== deletingQuestionId));
      toast({ title: "Question deleted" });
      setDeleteDialogOpen(false);
      setDeletingQuestionId(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">No questions yet</p>
          <Button onClick={() => setShowTypePicker(true)} disabled={isAdding}>
            {isAdding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add your first question
          </Button>
        </div>
      ) : (
        <>
          <QuestionList
            questions={questions}
            onReorder={handleReorder}
            onEdit={setEditingQuestion}
            onDelete={handleDeleteClick}
          />
          <Button onClick={() => setShowTypePicker(true)} className="w-full" disabled={isAdding}>
            {isAdding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Question
          </Button>
        </>
      )}

      <QuestionTypePicker
        open={showTypePicker}
        onOpenChange={setShowTypePicker}
        onSelect={handleAddQuestion}
      />

      <QuestionEditor
        question={editingQuestion}
        open={!!editingQuestion}
        onOpenChange={(open) => !open && setEditingQuestion(null)}
        onSave={handleEditQuestion}
        isSaving={isSaving}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) setDeletingQuestionId(null);
          setDeleteDialogOpen(open);
        }}
        title="Delete Question"
        description="Are you sure you want to delete this question? This action cannot be undone."
        onConfirm={confirmDeleteQuestion}
        isDeleting={isDeleting}
      />
    </div>
  );
}
