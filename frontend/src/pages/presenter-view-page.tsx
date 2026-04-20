import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { usePresenterSocket } from "../hooks/use-presenter-socket";
import {
  type ApiSession,
  type ApiSlide,
  fetchSession,
  fetchSlides,
  updateSession,
} from "../lib/session-api";
import { SlideCanvas } from "../components/slide-canvas";
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

  const currentSlide = useSessionStore((s) => s.currentSlide);
  const totalSlides = useSessionStore((s) => s.totalSlides);
  const connected = useSessionStore((s) => s.connected);
  const viewers = useSessionStore((s) => s.viewers);
  const controlGrantedTo = useSessionStore((s) => s.controlGrantedTo);
  const liveError = useSessionStore((s) => s.error);
  const status = useSessionStore((s) => s.status);
  const [showViewers, setShowViewers] = useState(false);

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

  const socketRef = usePresenterSocket({
    sessionId: session?.id ?? "",
    sessionCode: session?.code ?? "",
    enabled: Boolean(session?.id && session?.code),
    onReconnect: () => void loadPresenterData().catch(() => {}),
  });

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
  }, [session, showQr]);

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
    const updated = await updateSession(session.id, { status: "live" });
    setSession(updated);
    useSessionStore.getState().setStatus("live");
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

  if (!id) {
    return null;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-8 text-red-400">
        {loadError}{" "}
        <Link className="text-indigo-400" to="/dashboard">
          Back
        </Link>
      </div>
    );
  }

  if (!session) {
    return <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link className="text-zinc-400 hover:text-white" to={`/sessions/${session.id}/edit`}>
            ← Editor
          </Link>
          <span className="font-mono text-xs text-zinc-500">{session.code}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              connected ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"
            }`}
          >
            {connected ? "Live socket" : "Connecting…"}
          </span>
          <span className="text-zinc-500">
            Viewers: {viewers.length} {session.status === "live" ? "· LIVE" : ""}
            {controlGrantedTo ? (
              <span className="ml-2 text-amber-200/90">· Guest control</span>
            ) : null}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session.status !== "live" && status !== "ended" ? (
            <button
              type="button"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-emerald-400"
              onClick={() => void goLive()}
            >
              Go live
            </button>
          ) : null}
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-900 ${
              showViewers ? "border-indigo-500 text-indigo-200" : "border-zinc-700 text-zinc-200"
            }`}
            onClick={() => setShowViewers((v) => !v)}
          >
            Viewers
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
            onClick={() => setShowQr((v) => !v)}
          >
            QR / link
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950"
            onClick={() => endSession()}
          >
            End session
          </button>
        </div>
      </div>

      {liveError ? (
        <div className="bg-red-950 px-4 py-2 text-center text-sm text-red-200">{liveError}</div>
      ) : null}

      {showViewers ? (
        <div className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Viewer list</p>
              {controlGrantedTo ? (
                <p className="mt-1 text-sm text-amber-200">
                  Slides driven by{" "}
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs">
                    {shortSocketLabel(controlGrantedTo)}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">Only you can change slides.</p>
              )}
            </div>
            {controlGrantedTo ? (
              <button
                type="button"
                className="shrink-0 rounded-lg border border-amber-700/60 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-950/50"
                onClick={() => socketRef.current?.emit("control:revoke", { sessionId: session.id })}
              >
                Revoke guest control
              </button>
            ) : null}
          </div>
          {viewers.length === 0 ? (
            <p className="mx-auto mt-3 max-w-5xl text-sm text-zinc-500">No viewers connected yet.</p>
          ) : (
            <ul className="mx-auto mt-3 max-w-5xl divide-y divide-zinc-800 rounded-lg border border-zinc-800">
              {viewers.map((v) => (
                <li
                  key={v.socketId}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-zinc-300">{shortSocketLabel(v.socketId)}</span>
                  <div className="flex items-center gap-2">
                    {controlGrantedTo === v.socketId ? (
                      <span className="text-xs text-amber-300">Controlling slides</span>
                    ) : (
                      <button
                        type="button"
                        className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
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

      {status === "ended" || session.status === "ended" ? (
        <div className="bg-zinc-900 px-4 py-3 text-center text-sm text-zinc-400">Session ended</div>
      ) : null}

      <div className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center px-4 py-6">
        <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          {activeSlide ? (
            <SlideCanvas content={activeSlide.content} />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-zinc-500">
              Add slides in the editor to start presenting.
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-xl border border-zinc-700 px-5 py-2 text-sm hover:bg-zinc-900 disabled:opacity-40"
            disabled={totalSlides === 0}
            onClick={() => void go(-1)}
          >
            Previous
          </button>
          <span className="text-sm text-zinc-400">
            {totalSlides > 0 ? currentSlide + 1 : 0} / {totalSlides}
          </span>
          <button
            type="button"
            className="rounded-xl border border-zinc-700 px-5 py-2 text-sm hover:bg-zinc-900 disabled:opacity-40"
            disabled={totalSlides === 0}
            onClick={() => void go(1)}
          >
            Next
          </button>
        </div>
      </div>

      {showQr ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="presentation"
          onClick={() => setShowQr(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={qrTitleId}
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id={qrTitleId} className="text-sm font-medium text-white">
              Viewer link
            </p>
            <p className="mt-2 break-all font-mono text-xs text-zinc-400">{viewerUrl}</p>
            <div className="mt-4 flex justify-center">
              <QRCodeSVG value={viewerUrl} size={200} level="M" />
            </div>
            {copyHint ? (
              <p className="mt-2 text-xs text-zinc-400" role="status">
                {copyHint}
              </p>
            ) : null}
            <button
              ref={copyButtonRef}
              type="button"
              className="mt-4 w-full rounded-lg bg-zinc-800 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
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
              className="mt-2 w-full rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
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
