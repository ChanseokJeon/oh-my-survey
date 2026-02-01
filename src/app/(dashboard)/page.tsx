"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SurveyCard } from "@/components/survey/survey-card";
import { Plus, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIGeneratorDialog } from "@/components/survey/ai-generator";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

interface Survey {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "closed";
  theme: string;
  questionCount: number;
  responseCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null);
  const [deletingSingle, setDeletingSingle] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchSurveys();
  }, []);

  async function fetchSurveys() {
    try {
      const response = await fetch("/api/surveys");
      if (!response.ok) throw new Error("Failed to fetch surveys");
      const data = await response.json();
      setSurveys(data.surveys);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load surveys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(id: string) {
    setDeletingSurveyId(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (selectedIds.size > 0 && !deletingSurveyId) {
      await handleBulkDeleteConfirm();
    } else if (deletingSurveyId) {
      await handleSingleDeleteConfirm();
    }
  }

  async function handleSingleDeleteConfirm() {
    if (!deletingSurveyId) return;

    setDeletingSingle(true);
    try {
      const response = await fetch(`/api/surveys/${deletingSurveyId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete survey");
      setSurveys(surveys.filter((s) => s.id !== deletingSurveyId));
      toast({ title: "Survey deleted" });
      setDeleteDialogOpen(false);
      setDeletingSurveyId(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    } finally {
      setDeletingSingle(false);
    }
  }

  function handleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(surveys.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  }

  function handleBulkDeleteClick() {
    setDeletingSurveyId(null);
    setDeleteDialogOpen(true);
  }

  async function handleBulkDeleteConfirm() {
    if (selectedIds.size === 0) return;

    setBulkDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/surveys/${id}`, { method: "DELETE" })
      );

      const results = await Promise.all(deletePromises);
      const failedCount = results.filter((r) => !r.ok).length;
      const count = selectedIds.size;

      if (failedCount > 0) {
        toast({
          title: "Partial deletion",
          description: `${count - failedCount} deleted, ${failedCount} failed`,
          variant: "destructive",
        });
      } else {
        toast({ title: `${count} survey(s) deleted` });
      }

      setSurveys(surveys.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      setDeleteDialogOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete surveys",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground">
            Create and manage your surveys
          </p>
        </div>
        <div className="flex gap-2">
          {surveys.length > 0 && (
            <Button
              variant={selectionMode ? "secondary" : "outline"}
              onClick={toggleSelectionMode}
            >
              {selectionMode ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Checkbox className="mr-2 h-4 w-4" />
                  Select
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
          <Button asChild>
            <Link href="/surveys/new">
              <Plus className="mr-2 h-4 w-4" />
              New Survey
            </Link>
          </Button>
        </div>
      </div>

      {selectionMode && surveys.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedIds.size === surveys.length && surveys.length > 0}
              onCheckedChange={handleSelectAll}
              aria-label="Select all surveys"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size === 0
                ? "Select surveys"
                : `${selectedIds.size} of ${surveys.length} selected`}
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0 || bulkDeleting}
            onClick={handleBulkDeleteClick}
          >
            {bulkDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">No surveys yet</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Button>
            <Button asChild>
              <Link href="/surveys/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first survey
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={{
                ...survey,
                createdAt: new Date(survey.createdAt),
              }}
              onDelete={handleDeleteClick}
              selectable={selectionMode}
              selected={selectedIds.has(survey.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) setDeletingSurveyId(null);
          setDeleteDialogOpen(open);
        }}
        title={deletingSurveyId ? "Delete Survey" : `Delete ${selectedIds.size} Survey(s)`}
        description={
          deletingSurveyId
            ? "Are you sure you want to delete this survey? This action cannot be undone."
            : `Are you sure you want to delete ${selectedIds.size} survey(s)? This action cannot be undone.`
        }
        onConfirm={confirmDelete}
        isDeleting={deletingSingle || bulkDeleting}
      />

      <AIGeneratorDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onSurveyGenerated={(survey) => {
          router.push(`/surveys/${survey.id}/edit`);
        }}
      />
    </div>
  );
}
