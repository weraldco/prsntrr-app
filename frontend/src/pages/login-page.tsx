import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { loginRequest } from "../store/auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginRequest(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <div className="prsnt-auth-panel space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Log in</h1>
            <p className="mt-1 text-sm text-prsnt-ink/65">Welcome back to your sessions.</p>
          </div>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
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
              <span className="prsnt-field-label">Password</span>
              <input
                className="prsnt-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <button type="submit" disabled={loading} className="prsnt-btn-primary w-full">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="text-sm text-prsnt-ink/55">
            No account?{" "}
            <Link className="prsnt-link" to="/register">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
