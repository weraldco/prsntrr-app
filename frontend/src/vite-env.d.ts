/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Backend origin in production (Railway, Render, etc.). Omit in local dev (Vite proxy). */
  readonly VITE_API_BASE_URL?: string;
  /** Full URL for OAuth return path (e.g. https://app.example.com/auth/callback). Must be listed in Supabase redirect URLs. */
  readonly VITE_AUTH_CALLBACK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
