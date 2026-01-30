export function buildResponseHeaders(questions: Array<{ title: string }>): string[] {
  return [
    "Response ID",
    "Submitted At",
    "IP Address",
    ...questions.map((q) => q.title),
  ];
}

export function buildResponseRows(
  responses: Array<{
    id: string;
    completedAt: Date | null;
    ipAddress: string | null;
    answersJson: Record<string, unknown> | null;
  }>,
  questions: Array<{ id: string }>
): string[][] {
  return responses.map((response) => {
    const answers = response.answersJson as Record<string, unknown> || {};
    return [
      response.id,
      response.completedAt?.toISOString() || "",
      response.ipAddress || "",
      ...questions.map((q) => {
        const answer = answers[q.id];
        if (Array.isArray(answer)) {
          return answer.join("; ");
        }
        return String(answer ?? "");
      }),
    ];
  });
}
