const STORAGE_KEY = "prsntrr-theme";

export type ThemeMode = "light" | "dark";

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeClass(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function persistTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}
