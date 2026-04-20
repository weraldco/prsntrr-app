type Props = {
  currentIndex: number;
  totalSlides: number;
  blackout: boolean;
  onToggleBlackout: () => void;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
};

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a21.77 21.77 0 015.06-7.54M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a21.5 21.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <path d="M1 1l22 22" strokeLinecap="round" />
    </svg>
  );
}

export function PresenterDeckNav({
  currentIndex,
  totalSlides,
  blackout,
  onToggleBlackout,
  onPrev,
  onNext,
  disabled,
}: Props) {
  const displayCurrent = totalSlides > 0 ? currentIndex + 1 : 0;
  const progressPct = totalSlides > 0 ? (displayCurrent / totalSlides) * 100 : 0;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
      role="region"
      aria-label="Slide navigation"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-zinc-200/90 bg-white px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-zinc-800/95 dark:shadow-black/40 sm:gap-2 sm:px-4 sm:py-3">
        <button
          type="button"
          disabled={disabled}
          onClick={onPrev}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-700/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex min-w-[4.5rem] flex-col items-center gap-1.5 px-1 sm:min-w-[5.5rem] sm:px-2">
          <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
            {displayCurrent} / {totalSlides}
          </span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-600">
            <div
              className="h-full rounded-full bg-prsnt-cta transition-[width] duration-200 ease-out dark:bg-sky-400"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onNext}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-prsnt-cta bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:opacity-40 dark:border-sky-400 dark:bg-zinc-700/80 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:disabled:border-zinc-600"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="mx-1 h-8 w-px shrink-0 bg-zinc-200 dark:bg-zinc-600 sm:mx-2" aria-hidden />

        <button
          type="button"
          onClick={onToggleBlackout}
          aria-pressed={blackout}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
            blackout
              ? "bg-zinc-800 text-white dark:bg-zinc-950 dark:ring-2 dark:ring-sky-400"
              : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700/80 dark:text-zinc-100 dark:hover:bg-zinc-700"
          }`}
        >
          <EyeOffIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
          Blackout
        </button>
      </div>

      <p className="pointer-events-none text-center font-mono text-[10px] leading-relaxed text-prsnt-ink/45 sm:text-[11px] dark:text-prsnt-ink/40">
        <span className="whitespace-nowrap">← → navigate</span>
        <span className="mx-1.5 opacity-60" aria-hidden>
          ·
        </span>
        <span className="whitespace-nowrap">B blackout</span>
        <span className="mx-1.5 opacity-60" aria-hidden>
          ·
        </span>
        <span className="whitespace-nowrap">F fullscreen</span>
      </p>
    </div>
  );
}
