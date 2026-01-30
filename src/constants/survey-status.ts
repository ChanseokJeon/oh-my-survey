export type SurveyStatus = "draft" | "published" | "closed";

export interface SurveyStatusInfo {
  status: SurveyStatus;
  label: string;
  variant: "default" | "secondary" | "destructive";
  color: string;
}

export const SURVEY_STATUSES: SurveyStatusInfo[] = [
  {
    status: "draft",
    label: "Draft",
    variant: "secondary",
    color: "bg-slate-100 text-slate-700",
  },
  {
    status: "published",
    label: "Published",
    variant: "default",
    color: "bg-green-100 text-green-700",
  },
  {
    status: "closed",
    label: "Closed",
    variant: "destructive",
    color: "bg-red-100 text-red-700",
  },
];

export function getSurveyStatusInfo(status: SurveyStatus): SurveyStatusInfo | undefined {
  return SURVEY_STATUSES.find((s) => s.status === status);
}

export function getSurveyStatusLabel(status: SurveyStatus): string {
  return getSurveyStatusInfo(status)?.label || status;
}

export function getSurveyStatusVariant(status: SurveyStatus): "default" | "secondary" | "destructive" {
  return getSurveyStatusInfo(status)?.variant || "default";
}

export function getSurveyStatusColor(status: SurveyStatus): string {
  return getSurveyStatusInfo(status)?.color || "bg-gray-100 text-gray-700";
}
