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
          <h1 className="text-2xl font-semibold">New session</h1>
          <p className="text-sm text-prsnt-ink/65">You can add image slides after creating.</p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="prsnt-field-label">Title</span>
            <input
              className="prsnt-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="All-hands update"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="prsnt-btn-primary">
            {loading ? "Creating…" : "Create"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
