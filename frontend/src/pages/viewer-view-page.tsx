import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useViewerSocket } from "../hooks/use-viewer-socket";
import { SlideCanvas } from "../components/slide-canvas";
import { ThemeToggle } from "../components/theme-toggle";
import { eventTargetIsEditable } from "../lib/event-target-is-editable";
import { type ApiSlide, fetchPublicSession } from "../lib/session-api";
import { useSessionStore } from "../store/session-store";

export function ViewerViewPage() {
  const { code } = useParams<{ code: string }>();
  const [slides, setSlides] = useState<ApiSlide[]>([]);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const currentSlide = useSessionStore((s) => s.currentSlide);
  const totalSlides = useSessionStore((s) => s.totalSlides);
  const connected = useSessionStore((s) => s.connected);
  const status = useSessionStore((s) => s.status);
  const hasControl = useSessionStore((s) => s.hasControl);
  const sessionId = useSessionStore((s) => s.sessionId);

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

  /** If we showed "ended" but the presenter went live again via REST, refetch when tab is focused. */
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
      ? orderedSlides[Math.min(currentSlide, orderedSlides.length - 1)]
      : undefined;

  function go(delta: number) {
    if (!sessionId || totalSlides === 0) {
      return;
    }
    const idx = useSessionStore.getState().currentSlide;
    const next = Math.max(0, Math.min(totalSlides - 1, idx + delta));
    useSessionStore.getState().setSlide(next);
    socketRef.current?.emit("slide:change", { sessionId, slideIndex: next });
  }

  useEffect(() => {
    if (!hasControl || status === "ended") {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (eventTargetIsEditable(e.target)) {
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
  }, [hasControl, status, sessionId, totalSlides]);

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

      <div className="flex min-h-[calc(100dvh-52px)] flex-col items-center justify-center px-2 py-4 sm:px-3 sm:py-6">
        <div className="aspect-video w-full max-w-5xl min-w-0 overflow-hidden rounded-lg border border-teal-900/20 bg-zinc-950 sm:rounded-xl">
          {activeSlide ? (
            <SlideCanvas content={activeSlide.content} />
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center text-zinc-400">
              Waiting for slides…
            </div>
          )}
        </div>

        {hasControl && status !== "ended" ? (
          <div className="mt-4 flex w-full max-w-md flex-wrap items-center justify-center gap-2 px-2 sm:gap-3">
            <button
              type="button"
              className="min-h-11 min-w-11 flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 disabled:opacity-40 sm:flex-none sm:px-5 sm:py-2"
              disabled={totalSlides === 0}
              onClick={() => go(-1)}
            >
              Previous
            </button>
            <span className="flex min-h-11 min-w-[4.5rem] items-center justify-center text-sm tabular-nums text-prsnt-ink/55">
              {totalSlides > 0 ? currentSlide + 1 : 0} / {totalSlides}
            </span>
            <button
              type="button"
              className="min-h-11 min-w-11 flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 disabled:opacity-40 sm:flex-none sm:px-5 sm:py-2"
              disabled={totalSlides === 0}
              onClick={() => go(1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div className="pb-2 text-center text-xs text-prsnt-ink/45 sm:pb-6">
        Slide {totalSlides > 0 ? currentSlide + 1 : 0} / {totalSlides}
      </div>
    </div>
  );
}
