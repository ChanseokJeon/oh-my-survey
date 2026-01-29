"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ArrowLeft, Download, FileSpreadsheet, Loader2 } from "lucide-react";

interface Question {
  id: string;
  type: string;
  title: string;
  order: number;
}

interface Response {
  id: string;
  answers: Record<string, string | string[] | number>;
  completedAt: string;
  ipAddress: string | null;
}

interface Survey {
  id: string;
  title: string;
  questions: Question[];
}

export default function ResponsesPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = use(params);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [surveyId, page]);

  async function fetchData() {
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch(`/api/surveys/${surveyId}/responses?page=${page}&limit=20`),
      ]);

      if (!surveyRes.ok) throw new Error("Failed to fetch survey");
      if (!responsesRes.ok) throw new Error("Failed to fetch responses");

      const surveyData = await surveyRes.json();
      const responsesData = await responsesRes.json();

      setSurvey(surveyData);
      setResponses(responsesData.responses);
      setTotalPages(responsesData.pagination.totalPages);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses/export`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `responses-${surveyId}.csv`;
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
    setSyncing(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/sync-sheets`, {
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{survey?.title}</h1>
            <p className="text-muted-foreground">
              {responses.length > 0 ? `${responses.length} responses` : "No responses yet"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          {selectedResponse && survey && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Submitted: {new Date(selectedResponse.completedAt).toLocaleString()}
              </div>
              {survey.questions.map((question) => (
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
