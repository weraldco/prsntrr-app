import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { usePresenterSocket } from "../hooks/use-presenter-socket";
import {
  type ApiSession,
  type ApiSessionQuestion,
  type ApiSlide,
  fetchSession,
  fetchSessionQuestions,
  deleteSessionQuestion,
  fetchSlides,
  patchSessionQuestion,
  updateSession,
} from "../lib/session-api";
import { sortPresenterQuestions } from "../lib/sort-session-questions";
import { PresenterDeckNav } from "../components/presenter-deck-nav";
import { PresenterQuestionsDrawer } from "../components/presenter-questions-drawer";
import { SlideCanvas } from "../components/slide-canvas";
import { ThemeToggle } from "../components/theme-toggle";
import { eventTargetIsEditable } from "../lib/event-target-is-editable";
import { useSessionStore } from "../store/session-store";

export function PresenterViewPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<ApiSession | null>(null);
  const [slides, setSlides] = useState<ApiSlide[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const qrTitleId = useId();
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const currentSlide = useSessionStore((s) => s.currentSlide);
  const totalSlides = useSessionStore((s) => s.totalSlides);
  const connected = useSessionStore((s) => s.connected);
  const viewers = useSessionStore((s) => s.viewers);
  const controlGrantedTo = useSessionStore((s) => s.controlGrantedTo);
  const liveError = useSessionStore((s) => s.error);
  const status = useSessionStore((s) => s.status);
  const [showViewers, setShowViewers] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<ApiSessionQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [blackout, setBlackout] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current;
    if (!el) {
      return;
    }
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* user gesture or API unsupported */
    }
  }, []);

  const loadPresenterData = useCallback(async () => {
    if (!id) {
      throw new Error("missing session id");
    }
    const [s, sl] = await Promise.all([fetchSession(id), fetchSlides(id)]);
    setSession(s);
    setSlides(sl);
    useSessionStore.setState({
      sessionId: s.id,
      sessionCode: s.code,
      currentSlide: s.currentSlide,
      totalSlides: s.totalSlides,
      status: s.status,
      role: "presenter",
    });
  }, [id]);

  const applyQuestionFromSocket = useCallback((q: ApiSessionQuestion) => {
    setQuestions((prev) => sortPresenterQuestions([...prev.filter((x) => x.id !== q.id), q]));
  }, []);

  const removeQuestionFromList = useCallback((questionId: string) => {
    setQuestions((prev) => prev.filter((x) => x.id !== questionId));
  }, []);

  const refreshQuestions = useCallback(async () => {
    if (!session?.id) {
      return;
    }
    setQuestionsLoading(true);
    try {
      const qs = await fetchSessionQuestions(session.id);
      setQuestions(sortPresenterQuestions(qs));
    } catch {
      /* ignore */
    } finally {
      setQuestionsLoading(false);
    }
  }, [session?.id]);

  const socketRef = usePresenterSocket({
    sessionId: session?.id ?? "",
    sessionCode: session?.code ?? "",
    enabled: Boolean(session?.id && session?.code),
    onReconnect: () => void loadPresenterData().catch(() => {}),
    onQuestionCreated: applyQuestionFromSocket,
    onQuestionUpdated: applyQuestionFromSocket,
    onQuestionDeleted: ({ id }) => removeQuestionFromList(id),
  });

  useEffect(() => {
    if (!session?.id) {
      return;
    }
    void refreshQuestions();
  }, [session?.id, refreshQuestions]);

  useEffect(() => {
    if (!showQuestions || !session?.id) {
      return;
    }
    void refreshQuestions();
  }, [showQuestions, session?.id, refreshQuestions]);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        await loadPresenterData();
      } catch {
        if (!cancelled) {
          setLoadError("Could not load session");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadPresenterData]);

  useEffect(() => {
    setSession((prev) => (prev && prev.status !== status ? { ...prev, status } : prev));
  }, [status]);

  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  const activeSlide =
    orderedSlides.length > 0
      ? orderedSlides[Math.min(currentSlide, orderedSlides.length - 1)]
      : undefined;

  function go(delta: number) {
    if (!session) {
      return;
    }
    const tot = useSessionStore.getState().totalSlides;
    const idx = useSessionStore.getState().currentSlide;
    if (tot === 0) {
      return;
    }
    const next = Math.max(0, Math.min(tot - 1, idx + delta));
    useSessionStore.getState().setSlide(next);
    socketRef.current?.emit("slide:change", { sessionId: session.id, slideIndex: next });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showQr) {
        return;
      }
      if (eventTargetIsEditable(e.target)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setBlackout((v) => !v);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, showQr, toggleFullscreen]);

  useEffect(() => {
    if (!showQr) {
      setCopyHint(null);
      return;
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowQr(false);
      }
    }
    document.addEventListener("keydown", onDocKey);
    const t = window.setTimeout(() => copyButtonRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [showQr]);

  async function goLive() {
    if (!session) {
      return;
    }
    try {
      const updated = await updateSession(session.id, { status: "live" });
      setSession(updated);
      useSessionStore.getState().setStatus("live");
    } catch {
      useSessionStore.getState().setError("Could not go live. Try again.");
    }
  }

  function endSession() {
    if (!session) {
      return;
    }
    socketRef.current?.emit("session:end", { sessionId: session.id });
  }

  const viewerUrl =
    typeof window !== "undefined" && session
      ? `${window.location.origin}/view/${session.code}`
      : "";

  function shortSocketLabel(id: string) {
    if (id.length <= 12) {
      return id;
    }
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
  }

  const openQuestionCount = questions.filter((q) => !q.answered).length;

  async function toggleQuestionAnswered(q: ApiSessionQuestion, answered: boolean) {
    if (!session) {
      return;
    }
    try {
      const updated = await patchSessionQuestion(session.id, q.id, answered);
      applyQuestionFromSocket(updated);
    } catch {
      useSessionStore.getState().setError("Could not update question");
    }
  }

  async function deleteQuestion(q: ApiSessionQuestion) {
    if (!session) {
      return;
    }
    try {
      await deleteSessionQuestion(session.id, q.id);
      removeQuestionFromList(q.id);
    } catch {
      useSessionStore.getState().setError("Could not delete question");
    }
  }

  if (!id) {
    return null;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-prsnt-surface px-4 py-8 text-red-600">
        {loadError}{" "}
        <Link className="prsnt-link" to="/dashboard">
          Back
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-prsnt-surface px-4 py-8 text-prsnt-ink/55">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen bg-prsnt-surface font-sans text-prsnt-ink">
      <div className="flex items-center justify-between gap-4 border-b border-teal-900/10 bg-white/90 px-4 py-3 text-sm shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/90">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="font-medium text-prsnt-cta transition-colors hover:text-prsnt-primary"
            to={`/sessions/${session.id}/edit`}
          >
            ← Editor
          </Link>
          <span className="font-mono text-xs text-prsnt-ink/50">{session.code}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              connected
                ? "bg-teal-100 text-prsnt-primary"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {connected ? "Live socket" : "Connecting…"}
          </span>
          <span className="text-prsnt-ink/55">
            Viewers: {viewers.length} {status === "live" ? "· LIVE" : ""}
            {controlGrantedTo ? (
              <span className="ml-2 font-medium text-amber-800">· Guest control</span>
            ) : null}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle compact />
          {status === "live" ? (
            <button
              type="button"
              className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
              onClick={() => endSession()}
            >
              End session
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl bg-prsnt-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
              onClick={() => void goLive()}
            >
              Go live
            </button>
          )}
          <button
            type="button"
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              showViewers
                ? "border-prsnt-cta bg-sky-50 text-prsnt-cta"
                : "border-teal-900/15 bg-white text-prsnt-ink hover:bg-prsnt-surface dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
            }`}
            onClick={() => setShowViewers((v) => !v)}
          >
            Viewers
          </button>
          <button
            type="button"
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              showQuestions
                ? "border-prsnt-cta bg-sky-50 text-prsnt-cta"
                : "border-teal-900/15 bg-white text-prsnt-ink hover:bg-prsnt-surface dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
            }`}
            onClick={() => setShowQuestions((v) => !v)}
          >
            Questions
            {openQuestionCount > 0 ? (
              <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-prsnt-cta px-1 text-[10px] font-semibold leading-5 text-white">
                {openQuestionCount > 99 ? "99+" : openQuestionCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="rounded-xl border border-teal-900/15 bg-white px-3 py-1.5 text-xs font-medium text-prsnt-ink transition-colors hover:bg-prsnt-surface dark:border-white/10 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
            onClick={() => setShowQr((v) => !v)}
          >
            QR / link
          </button>
        </div>
      </div>

      {liveError ? (
        <div className="bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-700">{liveError}</div>
      ) : null}

      {showViewers ? (
        <div className="border-b border-teal-900/10 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-zinc-900/85">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-prsnt-ink/45">Viewer list</p>
              {controlGrantedTo ? (
                <p className="mt-1 text-sm text-amber-900">
                  Slides driven by{" "}
                  <span className="rounded-lg bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-amber-950">
                    {shortSocketLabel(controlGrantedTo)}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-prsnt-ink/60">Only you can change slides.</p>
              )}
            </div>
            {controlGrantedTo ? (
              <button
                type="button"
                className="shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100"
                onClick={() => socketRef.current?.emit("control:revoke", { sessionId: session.id })}
              >
                Revoke guest control
              </button>
            ) : null}
          </div>
          {viewers.length === 0 ? (
            <p className="mx-auto mt-3 max-w-5xl text-sm text-prsnt-ink/55">No viewers connected yet.</p>
          ) : (
            <ul className="mx-auto mt-3 max-w-5xl divide-y divide-teal-900/10 rounded-xl border border-teal-900/10 bg-white/90 dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900/70">
              {viewers.map((v) => (
                <li
                  key={v.socketId}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-prsnt-ink/70">{shortSocketLabel(v.socketId)}</span>
                  <div className="flex items-center gap-2">
                    {controlGrantedTo === v.socketId ? (
                      <span className="text-xs font-medium text-amber-800">Controlling slides</span>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg bg-prsnt-surface px-2 py-1 text-xs font-medium text-prsnt-ink ring-1 ring-teal-900/15 transition-colors hover:bg-teal-50"
                        onClick={() =>
                          socketRef.current?.emit("control:grant", {
                            sessionId: session.id,
                            viewerSocketId: v.socketId,
                          })
                        }
                      >
                        Give control
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {status === "ended" ? (
        <div className="border-b border-teal-900/10 bg-prsnt-surface px-4 py-3 text-center text-sm text-prsnt-ink/65">
          Session ended — use <span className="font-semibold text-prsnt-ink">Go live</span> in the header when you’re ready again.
        </div>
      ) : null}

      <div className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center px-4 py-6 pb-28">
        {status !== "live" ? (
          <div className="mb-4 w-full max-w-5xl rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-center shadow-sm sm:py-5">
            <p className="text-sm font-medium text-amber-950">
              {status === "ended"
                ? "Session is ended. Press Go live in the header to start presenting again."
                : "You’re not live yet — viewers need a live session to follow your slides."}
            </p>
            <button
              type="button"
              className="mt-3 rounded-xl bg-prsnt-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
              onClick={() => void goLive()}
            >
              Go live
            </button>
          </div>
        ) : null}
        <div
          ref={stageRef}
          className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-xl border border-teal-900/20 bg-zinc-950 shadow-xl"
        >
          {activeSlide ? (
            <SlideCanvas content={activeSlide.content} />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-zinc-400">
              Add slides in the editor to start presenting.
            </div>
          )}
          {blackout ? (
            <div
              className="absolute inset-0 z-20 bg-black"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <PresenterDeckNav
        currentIndex={currentSlide}
        totalSlides={totalSlides}
        blackout={blackout}
        onToggleBlackout={() => setBlackout((v) => !v)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        disabled={totalSlides === 0}
      />

      <PresenterQuestionsDrawer
        open={showQuestions}
        onClose={() => setShowQuestions(false)}
        questions={questions}
        loading={questionsLoading}
        onToggleAnswered={(q, answered) => void toggleQuestionAnswered(q, answered)}
        onDelete={(q) => void deleteQuestion(q)}
      />

      {showQr ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-prsnt-ink/40 px-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowQr(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={qrTitleId}
            className="w-full max-w-sm rounded-2xl border border-teal-900/10 bg-white p-6 text-center shadow-xl dark:border-white/10 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p id={qrTitleId} className="text-sm font-semibold text-prsnt-ink">
              Viewer link
            </p>
            <p className="mt-2 break-all font-mono text-xs text-prsnt-ink/60">{viewerUrl}</p>
            <div className="mt-4 flex justify-center">
              <QRCodeSVG value={viewerUrl} size={200} level="M" />
            </div>
            {copyHint ? (
              <p className="mt-2 text-xs text-prsnt-ink/55" role="status">
                {copyHint}
              </p>
            ) : null}
            <button
              ref={copyButtonRef}
              type="button"
              className="mt-4 w-full rounded-xl bg-prsnt-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
              onClick={() =>
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(viewerUrl);
                    setCopyHint("Copied to clipboard");
                  } catch {
                    setCopyHint("Could not copy — try selecting the link above");
                  }
                })()
              }
            >
              Copy link
            </button>
            <button
              type="button"
              className="mt-2 w-full rounded-xl border border-teal-900/15 py-2.5 text-sm font-medium text-prsnt-ink transition-colors hover:bg-prsnt-surface dark:border-white/10 dark:hover:bg-zinc-800"
              onClick={() => setShowQr(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
