import { Link, useNavigate } from "react-router-dom";
import { useHeaderScrolled } from "../hooks/use-header-scrolled";
import { ThemeToggle } from "./theme-toggle";
import { logoutRequest, useAuthStore } from "../store/auth-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const headerScrolled = useHeaderScrolled();

  async function handleLogout() {
    await logoutRequest();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-prsnt-surface font-sans text-prsnt-ink">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-200 ${
          headerScrolled ? "prsnt-header-scrolled" : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link
            to="/"
            className="font-logo text-xl font-semibold tracking-wide text-prsnt-ink transition-colors hover:text-prsnt-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-prsnt-cta focus-visible:ring-offset-2 focus-visible:ring-offset-prsnt-surface rounded-lg"
          >
            prsntrr
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {user ? (
              <>
                <Link className="font-medium text-prsnt-ink/75 transition-colors hover:text-prsnt-primary" to="/dashboard">
                  Dashboard
                </Link>
                <span className="max-w-[12rem] truncate text-prsnt-ink/50">{user.email}</span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded-xl border border-teal-900/15 bg-white px-3 py-1.5 text-sm font-medium text-prsnt-ink transition-colors hover:bg-white/90 dark:border-white/10 dark:bg-zinc-800/90 dark:hover:bg-zinc-800"
                >
                  Log out
                </button>
                <ThemeToggle compact />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="prsnt-btn-secondary px-3 py-1.5 text-xs sm:text-sm"
                >
                  Sign in
                </Link>
                <Link className="prsnt-btn-primary px-3 py-1.5 text-xs sm:text-sm" to="/register">
                  Sign up
                </Link>
                <ThemeToggle compact />
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-24 md:px-6">{children}</main>
    </div>
  );
}
