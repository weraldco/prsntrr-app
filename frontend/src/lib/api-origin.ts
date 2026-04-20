/**
 * Production: set VITE_API_BASE_URL to your API origin (no trailing slash), e.g.
 * https://your-app.up.railway.app — so /api and Socket.io hit the backend, not Vercel.
 * Dev: leave unset; Vite proxy sends /api to localhost:3001.
 */
export function apiOrigin(): string | undefined {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!raw || typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed || undefined;
}

/** Build an absolute URL for API paths or backend-served assets (/uploads/...). */
export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const origin = apiOrigin();
  if (!origin) {
    return path;
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
