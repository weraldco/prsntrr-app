import { create } from "zustand";
import { applyThemeClass, persistTheme, readStoredTheme, type ThemeMode } from "../lib/theme";

type ThemeState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const initial = readStoredTheme();
applyThemeClass(initial);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  setTheme: (theme) => {
    persistTheme(theme);
    applyThemeClass(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },
}));
