import { useAuthStore } from "../store/auth-store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  return { user, initialized };
}
