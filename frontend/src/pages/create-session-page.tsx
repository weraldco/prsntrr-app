import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { createSession } from "../lib/session-api";

export function CreateSessionPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await createSession(title);
      navigate(`/sessions/${session.id}/edit`);
    } catch {
      setError("Could not create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">New session</h1>
          <p className="text-sm text-zinc-400">You can add image slides after creating.</p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Title</span>
            <input
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none ring-indigo-500 focus:ring-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="All-hands update"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
