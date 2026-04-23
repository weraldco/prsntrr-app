import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) {
            return;
          }
          if (error) {
            navigate(`/login?error=${encodeURIComponent(error.message)}`, { replace: true });
            return;
          }
        }

        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();
        if (cancelled) {
          return;
        }
        if (sessionErr) {
          navigate(`/login?error=${encodeURIComponent(sessionErr.message)}`, { replace: true });
          return;
        }
        if (session) {
          navigate("/dashboard", { replace: true });
          return;
        }

        navigate(`/login?error=${encodeURIComponent("Sign-in did not complete. Try again.")}`, { replace: true });
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Sign-in failed";
          navigate(`/login?error=${encodeURIComponent(msg)}`, { replace: true });
        }
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center justify-center py-16 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-teal-900/20 border-t-prsnt-cta dark:border-white/10"
          aria-hidden
        />
        <p className="mt-4 text-sm text-prsnt-ink/65">Completing sign-in…</p>
      </div>
    </AppShell>
  );
}
