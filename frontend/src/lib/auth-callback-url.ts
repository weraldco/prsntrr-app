/**
 * Must match an entry in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 * Defaults to this origin + `/auth/callback`. Override when the app is served from a different public URL.
 */
export function getAuthCallbackUrl(): string {
  const fromEnv = import.meta.env.VITE_AUTH_CALLBACK_URL as string | undefined;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return "/auth/callback";
}
