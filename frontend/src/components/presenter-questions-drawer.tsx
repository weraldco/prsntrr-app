import { useEffect, useId, useState } from "react";
import type { ApiSessionQuestion } from "../lib/session-api";

type Props = {
  open: boolean;
  onClose: () => void;
  questions: ApiSessionQuestion[];
  loading: boolean;
  onToggleAnswered: (q: ApiSessionQuestion, answered: boolean) => void;
  onDelete: (q: ApiSessionQuestion) => void;
};

type PendingConfirm =
  | { kind: "delete"; question: ApiSessionQuestion }
  | { kind: "toggle"; question: ApiSessionQuestion; answered: boolean };

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Filled check — answered state (click to unmark). */
function IconCheckAnswered({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Outline circle + check — mark as answered. */
function IconCheckToAnswer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" />
      <path d="M8.5 12.5l2.2 2.2L15.2 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PresenterQuestionsDrawer({
  open,
  onClose,
  questions,
  loading,
  onToggleAnswered,
  onDelete,
}: Props) {
  const titleId = useId();
  const confirmTitleId = useId();
  const confirmDescId = useId();
  const [entered, setEntered] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setPendingConfirm(null);
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
      if (e.key !== "Escape") {
        return;
      }
      if (pendingConfirm) {
        e.stopPropagation();
        setPendingConfirm(null);
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, pendingConfirm]);

  function confirmAction() {
    if (!pendingConfirm) {
      return;
    }
    if (pendingConfirm.kind === "delete") {
      onDelete(pendingConfirm.question);
    } else {
      onToggleAnswered(pendingConfirm.question, pendingConfirm.answered);
    }
    setPendingConfirm(null);
  }

  if (!open) {
    return null;
  }

  const confirmCopy =
    pendingConfirm == null
      ? null
      : pendingConfirm.kind === "delete"
        ? {
            title: "Delete this question?",
            body: "This removes it permanently for everyone. You can’t undo this.",
            confirmLabel: "Delete",
            danger: true,
          }
        : pendingConfirm.answered
          ? {
              title: "Mark as answered?",
              body: "It will move to the bottom of the list with other answered questions.",
              confirmLabel: "Mark answered",
              danger: false,
            }
          : {
              title: "Mark as not answered?",
              body: "It will return to the open queue at the top.",
              confirmLabel: "Undo answered",
              danger: false,
            };

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
              Open first · Mark answered to move to the bottom
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
                  <div className="mt-3 flex items-center justify-end gap-1">
                    {q.answered ? (
                      <button
                        type="button"
                        className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        aria-label="Mark as not answered"
                        title="Answered — click to undo"
                        onClick={() => setPendingConfirm({ kind: "toggle", question: q, answered: false })}
                      >
                        <IconCheckAnswered className="h-6 w-6" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg p-2 text-prsnt-ink/55 transition-colors hover:bg-prsnt-surface hover:text-prsnt-cta dark:hover:bg-zinc-800"
                        aria-label="Mark as answered"
                        title="Mark answered"
                        onClick={() => setPendingConfirm({ kind: "toggle", question: q, answered: true })}
                      >
                        <IconCheckToAnswer className="h-6 w-6" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-lg p-2 text-prsnt-ink/50 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      aria-label="Delete question"
                      title="Delete"
                      onClick={() => setPendingConfirm({ kind: "delete", question: q })}
                    >
                      <IconTrash className="h-6 w-6" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {pendingConfirm && confirmCopy ? (
        <div
          className="absolute inset-0 z-[70] flex items-end justify-center bg-prsnt-ink/50 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => setPendingConfirm(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmDescId}
            className="w-full max-w-sm rounded-2xl border border-teal-900/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={confirmTitleId} className="text-base font-semibold text-prsnt-ink">
              {confirmCopy.title}
            </h3>
            <p id={confirmDescId} className="mt-2 text-sm text-prsnt-ink/65">
              {confirmCopy.body}
            </p>
            <p className="mt-3 line-clamp-4 rounded-lg bg-prsnt-surface px-3 py-2 text-xs text-prsnt-ink/80 dark:bg-zinc-800/80">
              {pendingConfirm.question.body}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border border-teal-900/15 px-4 py-2.5 text-sm font-medium text-prsnt-ink transition-colors hover:bg-prsnt-surface dark:border-white/10 dark:hover:bg-zinc-800"
                onClick={() => setPendingConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                  confirmCopy.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-prsnt-primary hover:bg-teal-800"
                }`}
                onClick={() => confirmAction()}
              >
                {confirmCopy.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
