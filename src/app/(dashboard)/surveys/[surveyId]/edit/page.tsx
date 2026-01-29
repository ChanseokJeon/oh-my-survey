"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QuestionList } from "@/components/builder/question-list";
import { QuestionTypePicker } from "@/components/builder/question-type-picker";
import { QuestionEditor } from "@/components/builder/question-editor";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";

interface Question {
  id: string;
  type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating";
  title: string;
  options: string[] | null;
  required: boolean;
  order: number;
}

interface Survey {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export default function EditSurveyPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  async function fetchSurvey() {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) throw new Error("Failed to fetch survey");
      const data = await response.json();
      setSurvey(data);
      setQuestions(data.questions || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load survey",
        variant: "destructive",
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddQuestion(type: Question["type"]) {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/questions`, {
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
    }
  }

  async function handleReorder(questionIds: string[]) {
    const previousQuestions = [...questions];
    // Optimistic update
    const reordered = questionIds.map((id, index) => ({
      ...questions.find((q) => q.id === id)!,
      order: index + 1,
    }));
    setQuestions(reordered);

    try {
      const response = await fetch(`/api/surveys/${surveyId}/questions/reorder`, {
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
    if (!editingQuestion) return;

    try {
      const response = await fetch(
        `/api/surveys/${surveyId}/questions/${editingQuestion.id}`,
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
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("Delete this question?")) return;

    try {
      const response = await fetch(
        `/api/surveys/${surveyId}/questions/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");
      setQuestions(questions.filter((q) => q.id !== id));
      toast({ title: "Question deleted" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{survey?.title}</h1>
            <p className="text-muted-foreground">Edit questions</p>
          </div>
        </div>
        {survey?.status === "published" && (
          <Button variant="outline" asChild>
            <Link href={`/s/${survey.slug}`} target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">No questions yet</p>
          <Button onClick={() => setShowTypePicker(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first question
          </Button>
        </div>
      ) : (
        <>
          <QuestionList
            questions={questions}
            onReorder={handleReorder}
            onEdit={setEditingQuestion}
            onDelete={handleDeleteQuestion}
          />
          <Button onClick={() => setShowTypePicker(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
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
      />
    </div>
  );
}
