"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, BarChart3, Settings, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SurveyCardProps {
  survey: {
    id: string;
    title: string;
    slug: string;
    status: "draft" | "published" | "closed";
    theme: string;
    questionCount: number;
    responseCount: number;
    createdAt: Date;
  };
  onDelete?: (id: string) => void;
}

const statusColors = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export function SurveyCard({ survey, onDelete }: SurveyCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold truncate pr-2">
          {survey.title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/surveys/${survey.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Questions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/surveys/${survey.id}/responses`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Responses
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/surveys/${survey.id}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(survey.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          <Badge className={statusColors[survey.status]}>{survey.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">{survey.questionCount}</span>
            {" "}questions
          </div>
          <div>
            <span className="font-medium text-foreground">{survey.responseCount}</span>
            {" "}responses
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex w-full gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/surveys/${survey.id}/edit`}>Edit</Link>
          </Button>
          {survey.status === "published" && (
            <Button asChild className="flex-1">
              <Link href={`/s/${survey.slug}`} target="_blank">View</Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
