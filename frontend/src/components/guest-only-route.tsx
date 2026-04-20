import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

type Props = { children: React.ReactNode };

/** Renders children only when there is no session; redirects authenticated users to the dashboard. */
export function GuestOnlyRoute({ children }: Props) {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);

  if (!initialized) {
    return <div className="min-h-screen bg-prsnt-surface" aria-busy="true" />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
