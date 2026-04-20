import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth-store";

type Props = { children: React.ReactNode };

export function ProtectedRoute({ children }: Props) {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!initialized) {
    return <div className="min-h-screen bg-prsnt-surface" />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
