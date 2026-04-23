import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ViewerDeckNav } from "../components/viewer-deck-nav";
import { SlideCanvas } from "../components/slide-canvas";
import { ThemeToggle } from "../components/theme-toggle";
import { useViewerSlideCache } from "../hooks/use-viewer-slide-cache";
import { eventTargetIsEditable } from "../lib/event-target-is-editable";
import { readViewerPreferences, writeViewerPreferences } from "../lib/viewer-preferences";
import { type ApiSlide, fetchPublicSession, submitViewerQuestion } from "../lib/session-api";
import { useSessionStore } from "../store/session-store";
import { useViewerSocket } from "../hooks/use-viewer-socket";

export function ViewerViewPage() {
  const { code } = useParams<{ code: string }>();
  const [slides, setSlides] = useState<ApiSlide[]>([]);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [followPresenter, setFollowPresenter] = useState(true);
  const [freeSlideIndex, setFreeSlideIndex] = useState(0);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionSending, setQuestionSending] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [imageErrorDismiss, setImageErrorDismiss] = useState(false);

  const presenterSlide = useSessionStore((s) => s.currentSlide);
  const totalSlides = useSessionStore((s) => s.totalSlides);
  const connected = useSessionStore((s) => s.connected);
  const status = useSessionStore((s) => s.status);
  const hasControl = useSessionStore((s) => s.hasControl);
  const sessionId = useSessionStore((s) => s.sessionId);

  const displayIndex = followPresenter ? presenterSlide : freeSlideIndex;

  useEffect(() => {
    if (!code) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPublicSession(code);
        if (cancelled) {
          return;
        }
        setTitle(data.session.title);
        setSlides(data.slides);
        useSessionStore.setState({
          sessionId: data.session.id,
          sessionCode: data.session.code,
          currentSlide: data.session.currentSlide,
          totalSlides: data.session.totalSlides,
          status: data.session.status,
          role: "viewer",
        });
        setFreeSlideIndex(data.session.currentSlide);
        const prefs = readViewerPreferences(code);
        if (prefs) {
          setFollowPresenter(prefs.followPresenter);
          const tot = data.session.totalSlides;
          if (!prefs.followPresenter && tot > 0) {
            setFreeSlideIndex(Math.min(Math.max(0, prefs.lastSlideIndex), tot - 1));
          }
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          setError("Session not found or expired.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const refetchFromApi = useCallback(async () => {
    if (!code) {
      return;
    }
    try {
      const data = await fetchPublicSession(code);
      setSlides(data.slides);
      useSessionStore.setState({
        sessionId: data.session.id,
        sessionCode: data.session.code,
        currentSlide: data.session.currentSlide,
        totalSlides: data.session.totalSlides,
        status: data.session.status,
      });
    } catch {
      /* keep existing UI if refetch fails mid-reconnect */
    }
  }, [code]);

  const socketRef = useViewerSocket({
    sessionCode: code?.toUpperCase() ?? "",
    enabled: Boolean(ready && code),
    onReconnect: refetchFromApi,
  });

  useEffect(() => {
    if (!ready || !code || status !== "ended") {
      return;
    }
    function onVisible() {
      if (document.visibilityState === "visible") {
        void refetchFromApi();
      }
    }
    window.addEventListener("focus", refetchFromApi);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refetchFromApi);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, code, status, refetchFromApi]);

  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  const activeSlide =
    orderedSlides.length > 0
      ? orderedSlides[Math.min(displayIndex, orderedSlides.length - 1)]
      : undefined;

  const { purifiedHtml, isImageCachedReady, markCurrentImageDecoded } = useViewerSlideCache({
    orderedSlides,
    activeIndex: displayIndex,
    enabled: ready && !error,
    sessionCode: code ?? "",
  });

  useEffect(() => {
    setImageErrorDismiss(false);
  }, [activeSlide?.id]);

  useEffect(() => {
    if (!ready || !code) {
      return;
    }
    const t = window.setTimeout(() => {
      writeViewerPreferences(code, {
        followPresenter,
        lastSlideIndex: displayIndex,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [ready, code, followPresenter, displayIndex]);

  const showSlideLoader =
    activeSlide != null &&
    activeSlide.content.type === "image" &&
    !isImageCachedReady &&
    !imageErrorDismiss;

  const navDisabled = followPresenter && !hasControl;

  const go = useCallback(
    (delta: number) => {
      if (!sessionId || totalSlides === 0) {
        return;
      }
      if (followPresenter && !hasControl) {
        return;
      }
      if (!followPresenter) {
        setFreeSlideIndex((i) => Math.max(0, Math.min(totalSlides - 1, i + delta)));
        return;
      }
      const idx = useSessionStore.getState().currentSlide;
      const next = Math.max(0, Math.min(totalSlides - 1, idx + delta));
      useSessionStore.getState().setSlide(next);
      socketRef.current?.emit("slide:change", { sessionId, slideIndex: next });
    },
    [followPresenter, hasControl, sessionId, socketRef, totalSlides],
  );

  const jumpToPresenter = useCallback(() => {
    const target = useSessionStore.getState().currentSlide;
    setFreeSlideIndex(target);
  }, []);

  const onFollowPresenterChange = useCallback(
    (follow: boolean) => {
      if (follow) {
        setFollowPresenter(true);
      } else {
        setFreeSlideIndex(followPresenter ? presenterSlide : displayIndex);
        setFollowPresenter(false);
      }
    },
    [displayIndex, followPresenter, presenterSlide],
  );

  useEffect(() => {
    if (status === "ended") {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (eventTargetIsEditable(e.target)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const allowNav = !followPresenter || (followPresenter && hasControl);
      if (!allowNav) {
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
  }, [followPresenter, go, hasControl, status]);

  useEffect(() => {
    if (!showQuestionModal) {
      setQuestionError(null);
    }
  }, [showQuestionModal]);

  async function sendQuestion() {
    if (!code) {
      return;
    }
    const trimmed = questionDraft.trim();
    if (!trimmed) {
      setQuestionError("Enter a question.");
      return;
    }
    setQuestionSending(true);
    setQuestionError(null);
    try {
      await submitViewerQuestion(code, trimmed);
      setQuestionDraft("");
      setShowQuestionModal(false);
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setQuestionSending(false);
    }
  }

  if (!code) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-prsnt-surface px-4 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-prsnt-surface text-prsnt-ink/55">
        Joining…
      </div>
    );
  }

  const jumpRedundant = followPresenter || displayIndex === presenterSlide;

  return (
    <div className="relative min-h-screen bg-prsnt-surface pb-[max(1.5rem,env(safe-area-inset-bottom))] font-sans text-prsnt-ink">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-900/10 bg-white/90 px-3 py-2 text-sm shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/90 sm:gap-3 sm:px-4 sm:py-3">
        <p className="min-w-0 flex-1 truncate font-semibold text-prsnt-ink">{title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle compact />
          {hasControl ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              You’re controlling
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              connected ? "bg-teal-100 text-prsnt-primary" : "bg-amber-100 text-amber-800"
            }`}
          >
            {connected ? "Live" : "Reconnecting…"}
          </span>
        </div>
      </div>

      {status === "ended" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-prsnt-ink/80 px-6 text-center backdrop-blur-sm">
          <div>
            <p className="text-xl font-semibold text-white">Session ended</p>
            <p className="mt-2 text-sm text-white/75">You can close this page.</p>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100dvh-52px)] flex-col items-center justify-center px-2 py-4 pb-28 sm:px-3 sm:py-6">
        <div
          className="relative aspect-video w-full max-w-5xl min-w-0 overflow-hidden rounded-lg border border-teal-900/20 bg-zinc-950 sm:rounded-xl"
          aria-busy={showSlideLoader}
        >
          {activeSlide ? (
            <>
              <SlideCanvas
                content={activeSlide.content}
                purifiedHtmlOverride={
                  activeSlide.content.type === "html" ? purifiedHtml : undefined
                }
                onImageLoad={markCurrentImageDecoded}
                onImageError={() => setImageErrorDismiss(true)}
              />
              {showSlideLoader ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-950/85 text-zinc-300 transition-opacity duration-150">
                  <span
                    className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-sky-400"
                    aria-hidden
                  />
                  <span className="text-xs font-medium tracking-wide text-zinc-400">Loading slide…</span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center text-zinc-400">
              Waiting for slides…
            </div>
          )}
        </div>
      </div>

      {status !== "ended" ? (
        <ViewerDeckNav
          followPresenter={followPresenter}
          onFollowPresenterChange={onFollowPresenterChange}
          displayIndex={displayIndex}
          totalSlides={totalSlides}
          presenterSlideIndex={presenterSlide}
          navDisabled={navDisabled}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onJumpToPresenter={jumpToPresenter}
          onOpenQuestion={() => setShowQuestionModal(true)}
          jumpRedundant={jumpRedundant}
        />
      ) : null}

      {showQuestionModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-prsnt-ink/40 px-0 backdrop-blur-sm sm:items-center sm:px-4"
          role="presentation"
          onClick={() => !questionSending && setShowQuestionModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="viewer-question-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-teal-900/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="viewer-question-title" className="text-base font-semibold text-prsnt-ink">
              Ask the presenter
            </p>
            <p className="mt-1 text-xs text-prsnt-ink/55">
              Your question is queued for the presenter. It may take a moment to appear on their screen.
            </p>
            <textarea
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              maxLength={2000}
              rows={4}
              className="mt-3 w-full resize-y rounded-xl border border-teal-900/15 bg-prsnt-surface px-3 py-2 text-sm text-prsnt-ink outline-none ring-prsnt-cta/30 focus:ring-2 dark:border-white/10 dark:bg-zinc-800"
              placeholder="Type your question…"
              disabled={questionSending}
            />
            <p className="mt-1 text-right text-[10px] text-prsnt-ink/40">{questionDraft.length} / 2000</p>
            {questionError ? <p className="mt-2 text-sm text-red-600">{questionError}</p> : null}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={questionSending}
                className="rounded-xl border border-teal-900/15 py-2.5 text-sm font-medium text-prsnt-ink transition-colors hover:bg-prsnt-surface dark:border-white/10 dark:hover:bg-zinc-800"
                onClick={() => setShowQuestionModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={questionSending}
                className="rounded-xl bg-prsnt-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
                onClick={() => void sendQuestion()}
              >
                {questionSending ? "Sending…" : "Submit question"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
