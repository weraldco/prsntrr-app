import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { OauthProviderButtons } from "../components/oauth-provider-buttons";
import { registerRequest } from "../store/auth-store";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerRequest(email, password, name);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <div className="prsnt-auth-panel space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Create account</h1>
            <p className="mt-1 text-sm text-prsnt-ink/65">Start hosting synced presentations.</p>
          </div>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="prsnt-field-label">Name</span>
              <input className="prsnt-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="block space-y-1.5">
              <span className="prsnt-field-label">Email</span>
              <input
                className="prsnt-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="prsnt-field-label">Password (min 8 characters)</span>
              <input
                className="prsnt-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <button type="submit" disabled={loading} className="prsnt-btn-primary w-full">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
          <OauthProviderButtons onError={setError} disabled={loading} />
          <p className="text-sm text-prsnt-ink/55">
            Already have an account?{" "}
            <Link className="prsnt-link" to="/login">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
