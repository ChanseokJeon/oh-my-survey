"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Loader2 } from "lucide-react";
import { Question } from "@/types/question";
import { ConfirmNavigationDialog } from "@/components/confirm-navigation-dialog";

interface QuestionEditorProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (question: Partial<Question>) => void;
  isSaving?: boolean;
}

export function QuestionEditor({
  question,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: QuestionEditorProps) {
  const [title, setTitle] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  useEffect(() => {
    if (question) {
      setTitle(question.title);
      setRequired(question.required);
      setOptions(question.options || []);
      setIsDirty(false);
    }
  }, [question]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setIsDirty(true);
  };

  const handleRequiredChange = (value: boolean) => {
    setRequired(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const updates: Partial<Question> = {
      title: title.trim(),
      required,
    };

    if (question?.type === "multiple_choice") {
      updates.options = options.filter((o) => o.trim());
    }

    onSave(updates);
    setIsDirty(false);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && isDirty) {
      setShowConfirmClose(true);
    } else {
      onOpenChange(open);
    }
  };

  const addOption = () => {
    setOptions([...options, ""]);
    setIsDirty(true);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    setIsDirty(true);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  if (!question) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Question</Label>
            {question.type === "long_text" ? (
              <Textarea
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter your question..."
                rows={3}
              />
            ) : (
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter your question..."
              />
            )}
          </div>

          {question.type === "multiple_choice" && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 2}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={options.length >= 10}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="required">Required</Label>
            <Switch
              id="required"
              checked={required}
              onCheckedChange={handleRequiredChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmNavigationDialog
      open={showConfirmClose}
      onConfirm={() => {
        setShowConfirmClose(false);
        setIsDirty(false);
        onOpenChange(false);
      }}
      onCancel={() => setShowConfirmClose(false)}
    />
    </>
  );
}
