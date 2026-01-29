"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSurvey } from "@/contexts/survey-context";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

interface Response {
  id: string;
  answers: Record<string, string | string[] | number>;
  completedAt: string;
  ipAddress: string | null;
}

export default function ResponsesPage() {
  const { survey, questions } = useSurvey();
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (survey) {
      fetchResponses();
    }
  }, [survey, page]);

  async function fetchResponses() {
    if (!survey) return;

    try {
      const responsesRes = await fetch(`/api/surveys/${survey.id}/responses?page=${page}&limit=20`);
      if (!responsesRes.ok) throw new Error("Failed to fetch responses");

      const responsesData = await responsesRes.json();
      setResponses(responsesData.responses);
      setTotalPages(responsesData.pagination.totalPages);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!survey) return;

    setExporting(true);
    try {
      const response = await fetch(`/api/surveys/${survey.id}/responses/export`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `responses-${survey.id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Export complete" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to export responses",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleSyncSheets() {
    if (!survey) return;

    setSyncing(true);
    try {
      const response = await fetch(`/api/surveys/${survey.id}/sync-sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sync failed");
      }

      const data = await response.json();
      toast({
        title: "Sync complete",
        description: `Synced ${data.syncedCount} responses`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  function formatAnswer(answer: string | string[] | number | undefined): string {
    if (answer === undefined || answer === null) return "-";
    if (Array.isArray(answer)) return answer.join(", ");
    if (typeof answer === "number") return `${answer} stars`;
    return answer;
  }

  if (!survey || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleExport} disabled={exporting || responses.length === 0}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
        <Button variant="outline" onClick={handleSyncSheets} disabled={syncing || responses.length === 0}>
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          Sync to Sheets
        </Button>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground">No responses yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id}>
                  <TableCell>
                    {new Date(response.completedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {response.ipAddress || "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {Object.values(response.answers)[0]?.toString().slice(0, 50) || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedResponse(response)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Response Details</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Submitted: {new Date(selectedResponse.completedAt).toLocaleString()}
              </div>
              {questions.map((question) => (
                <div key={question.id} className="border-b pb-4">
                  <p className="font-medium mb-1">{question.title}</p>
                  <p className="text-muted-foreground">
                    {formatAnswer(selectedResponse.answers[question.id])}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
