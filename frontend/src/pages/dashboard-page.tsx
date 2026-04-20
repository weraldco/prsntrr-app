import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { type ApiSession, fetchMySessions } from "../lib/session-api";

export function DashboardPage() {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchMySessions();
        if (!cancelled) {
          setSessions(data);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load sessions");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Your sessions</h1>
            <p className="text-sm text-zinc-400">Create, edit slides, then present live.</p>
          </div>
          <Link
            to="/sessions/new"
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            New session
          </Link>
        </div>
        {loading ? <p className="text-zinc-500">Loading…</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {!loading && sessions.length === 0 ? (
          <p className="text-zinc-500">No sessions yet. Create one to get started.</p>
        ) : null}
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{s.title}</p>
                <p className="text-xs text-zinc-500">
                  Code <span className="font-mono text-zinc-300">{s.code}</span> · {s.status} ·{" "}
                  {s.totalSlides} slides
                  {typeof s.peakViewerCount === "number" && s.peakViewerCount > 0 ? (
                    <> · Peak viewers {s.peakViewerCount}</>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
                  to={`/sessions/${s.id}/edit`}
                >
                  Edit slides
                </Link>
                <Link
                  className="rounded-lg bg-zinc-100 px-3 py-1.5 font-medium text-zinc-900 hover:bg-white"
                  to={`/sessions/${s.id}/present`}
                >
                  Present
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
