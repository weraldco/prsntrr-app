import { useThemeStore } from "../store/theme-store";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Props = {
  /** Larger hit target in toolbars */
  compact?: boolean;
};

export function ThemeToggle({ compact }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-teal-900/15 bg-white/80 text-prsnt-ink shadow-sm transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-prsnt-cta focus-visible:ring-offset-2 focus-visible:ring-offset-prsnt-surface dark:border-white/10 dark:bg-zinc-800/90 dark:text-prsnt-ink dark:hover:bg-zinc-800 ${
        compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9"
      }`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
