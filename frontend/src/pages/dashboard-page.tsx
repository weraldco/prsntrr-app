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
            <h1 className="text-2xl font-semibold">Your sessions</h1>
            <p className="text-sm text-prsnt-ink/65">Create, edit slides, then present live.</p>
          </div>
          <Link to="/sessions/new" className="prsnt-btn-primary">
            New session
          </Link>
        </div>
        {loading ? <p className="text-prsnt-ink/50">Loading…</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && sessions.length === 0 ? (
          <p className="text-prsnt-ink/55">No sessions yet. Create one to get started.</p>
        ) : null}
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id} className="prsnt-card flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className="font-semibold text-prsnt-ink">{s.title}</p>
                <p className="text-xs text-prsnt-ink/55">
                  Code <span className="font-mono text-prsnt-ink/80">{s.code}</span> · {s.status} ·{" "}
                  {s.totalSlides} slides
                  {typeof s.peakViewerCount === "number" && s.peakViewerCount > 0 ? (
                    <> · Peak viewers {s.peakViewerCount}</>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link className="prsnt-btn-ghost px-3 py-1.5 text-xs sm:text-sm" to={`/sessions/${s.id}/edit`}>
                  Edit slides
                </Link>
                <Link
                  className="rounded-xl bg-prsnt-cta px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-800 sm:text-sm"
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
