import type { ApiSessionQuestion } from "./session-api";

export function sortPresenterQuestions(questions: ApiSessionQuestion[]): ApiSessionQuestion[] {
  const open = questions
    .filter((q) => !q.answered)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = questions
    .filter((q) => q.answered)
    .sort((a, b) => {
      const at = a.answeredAt ?? "";
      const bt = b.answeredAt ?? "";
      if (at !== bt) {
        return at.localeCompare(bt);
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
  return [...open, ...done];
}
