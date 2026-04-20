import { Link, useNavigate } from "react-router-dom";
import { logoutRequest, useAuthStore } from "../store/auth-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutRequest();
    navigate("/");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-white">
            prsntrr
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <Link className="text-zinc-300 hover:text-white" to="/dashboard">
                  Dashboard
                </Link>
                <span className="text-zinc-500">{user.email}</span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="text-zinc-300 hover:text-white" to="/login">
                  Log in
                </Link>
                <Link
                  className="rounded-lg bg-indigo-500 px-3 py-1.5 font-medium text-white hover:bg-indigo-400"
                  to="/register"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
