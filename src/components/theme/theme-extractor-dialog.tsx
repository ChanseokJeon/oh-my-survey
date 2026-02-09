"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExtractTheme } from "@/hooks/use-extract-theme";
import { ThemePreviewCard } from "./theme-preview-card";
import { CustomThemeData } from "@/lib/theme/types";
import { useToast } from "@/hooks/use-toast";
import { Upload, Link as LinkIcon, Loader2 } from "lucide-react";

interface ThemeExtractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  onApplyTheme: (theme: CustomThemeData) => void;
}

export function ThemeExtractorDialog({
  open,
  onOpenChange,
  surveyId,
  onApplyTheme,
}: ThemeExtractorDialogProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [extractedTheme, setExtractedTheme] = useState<CustomThemeData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const extractMutation = useExtractTheme();

  const showError = (title: string, description?: string) => {
    toast({ title, description, variant: "destructive" });
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showError("Invalid file type", "Please upload an image file (JPEG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError("File too large", "Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const result = await extractMutation.mutateAsync({
          surveyId,
          source: "base64",
          data: base64,
        });
        setExtractedTheme(result.suggestedTheme);
      } catch (error) {
        showError("Extraction failed", error instanceof Error ? error.message : "Failed to extract colors");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) {
      showError("URL required", "Please enter an image URL");
      return;
    }

    try {
      const result = await extractMutation.mutateAsync({
        surveyId,
        source: "url",
        data: imageUrl,
      });
      setExtractedTheme(result.suggestedTheme);
    } catch (error) {
      showError("Extraction failed", error instanceof Error ? error.message : "Failed to extract colors");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleApply = () => {
    if (extractedTheme) {
      onApplyTheme(extractedTheme);
      onOpenChange(false);
      setExtractedTheme(null);
      setImageUrl("");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setExtractedTheme(null);
    setImageUrl("");
    setActiveTab("upload");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extract Theme from Image</DialogTitle>
          <DialogDescription>
            Upload an image or provide a URL to automatically generate a custom theme
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "url")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </TabsTrigger>
            <TabsTrigger value="url">
              <LinkIcon className="mr-2 h-4 w-4" />
              Image URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop an image here, or click to select
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={extractMutation.isPending}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <p className="text-xs text-muted-foreground mt-4">
                Supported: JPEG, PNG, GIF, WebP (max 5MB)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={extractMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Paste a publicly accessible image URL (HTTPS recommended)
              </p>
            </div>
            <Button
              onClick={handleUrlSubmit}
              disabled={extractMutation.isPending || !imageUrl.trim()}
              className="w-full"
            >
              {extractMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Extract Theme
            </Button>
          </TabsContent>
        </Tabs>

        {extractMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Extracting colors from image...
              </p>
            </div>
          </div>
        )}

        {extractedTheme && !extractMutation.isPending && (
          <div className="space-y-4">
            <ThemePreviewCard theme={extractedTheme} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {extractedTheme && (
            <Button onClick={handleApply}>
              Apply Theme
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
