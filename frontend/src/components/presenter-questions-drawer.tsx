import { useEffect, useId, useState } from "react";
import type { ApiSessionQuestion } from "../lib/session-api";

type Props = {
  open: boolean;
  onClose: () => void;
  questions: ApiSessionQuestion[];
  loading: boolean;
  onToggleAnswered: (q: ApiSessionQuestion, answered: boolean) => void;
};

export function PresenterQuestionsDrawer({
  open,
  onClose,
  questions,
  loading,
  onToggleAnswered,
}: Props) {
  const titleId = useId();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    setEntered(false);
    const t = window.setTimeout(() => setEntered(true), 16);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className={`absolute inset-0 bg-prsnt-ink/40 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/50 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close questions"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 right-0 z-10 flex h-full w-full max-w-md flex-col border-l border-teal-900/10 bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out dark:border-white/10 dark:bg-zinc-900 ${
          entered ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-teal-900/10 px-4 py-4 dark:border-white/10">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-prsnt-ink">
              Questions
            </h2>
            <p className="mt-1 text-xs text-prsnt-ink/55">
              Open first · Check answered to move to the bottom
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-prsnt-ink/60 transition-colors hover:bg-prsnt-surface hover:text-prsnt-ink dark:hover:bg-zinc-800"
            onClick={onClose}
            aria-label="Close panel"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-prsnt-ink/55">Loading questions…</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-prsnt-ink/55">No questions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 pb-4">
              {questions.map((q) => (
                <li
                  key={q.id}
                  className={`rounded-xl border border-teal-900/10 px-3 py-3 dark:border-white/10 ${
                    q.answered ? "bg-zinc-50/90 dark:bg-zinc-950/50" : "bg-white dark:bg-zinc-900/40"
                  }`}
                >
                  <p className="text-sm leading-relaxed text-prsnt-ink">{q.body}</p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 font-mono text-xs text-prsnt-ink/80">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-teal-900/25 text-prsnt-cta focus:ring-prsnt-cta"
                      checked={q.answered}
                      onChange={(e) => void onToggleAnswered(q, e.target.checked)}
                    />
                    Answered
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
