type Props = {
  followPresenter: boolean;
  onFollowPresenterChange: (follow: boolean) => void;
  displayIndex: number;
  totalSlides: number;
  presenterSlideIndex: number;
  navDisabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJumpToPresenter: () => void;
  onOpenQuestion: () => void;
  /** True when in free mode but already on the same slide as the presenter. */
  jumpRedundant: boolean;
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

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ViewerDeckNav({
  followPresenter,
  onFollowPresenterChange,
  displayIndex,
  totalSlides,
  presenterSlideIndex,
  navDisabled,
  onPrev,
  onNext,
  onJumpToPresenter,
  onOpenQuestion,
  jumpRedundant,
}: Props) {
  const displayCurrent = totalSlides > 0 ? displayIndex + 1 : 0;
  const progressPct = totalSlides > 0 ? (displayCurrent / totalSlides) * 100 : 0;
  const presenterLabel = totalSlides > 0 ? presenterSlideIndex + 1 : 0;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-4"
      role="region"
      aria-label="Viewer controls"
    >
      <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white px-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-zinc-800/95 dark:shadow-black/40 sm:rounded-full sm:flex-row sm:flex-wrap sm:items-center sm:gap-1 sm:px-3 sm:py-2.5 md:max-w-4xl md:gap-2 md:px-4 md:py-3">
        <div
          className="flex w-full shrink-0 justify-center sm:w-auto sm:justify-start"
          role="group"
          aria-label="Follow mode"
        >
          <div className="inline-flex rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-700/80">
            <button
              type="button"
              onClick={() => onFollowPresenterChange(true)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                followPresenter
                  ? "bg-white text-prsnt-cta shadow-sm dark:bg-zinc-900 dark:text-sky-400"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              }`}
            >
              Follow
            </button>
            <button
              type="button"
              onClick={() => onFollowPresenterChange(false)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                !followPresenter
                  ? "bg-white text-prsnt-cta shadow-sm dark:bg-zinc-900 dark:text-sky-400"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              }`}
            >
              Free
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 items-center justify-center gap-0.5 sm:mx-0 sm:w-auto sm:max-w-none sm:justify-center sm:gap-1">
          <button
            type="button"
            disabled={navDisabled || totalSlides === 0}
            onClick={onPrev}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-700/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-[4.25rem] flex-col items-center gap-1 px-0.5 sm:min-w-[5.5rem] sm:px-2">
            <span className="text-xs font-semibold tabular-nums text-zinc-800 sm:text-sm dark:text-zinc-100">
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
            disabled={navDisabled || totalSlides === 0}
            onClick={onNext}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-prsnt-cta bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:opacity-40 dark:border-sky-400 dark:bg-zinc-700/80 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:disabled:border-zinc-600"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-zinc-200 sm:mx-1 sm:block dark:bg-zinc-600" aria-hidden />

        <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:w-auto sm:flex-1 sm:justify-end">
          <button
            type="button"
            disabled={totalSlides === 0 || jumpRedundant}
            onClick={onJumpToPresenter}
            title={followPresenter ? `Presenter is on slide ${presenterLabel}` : `Go to presenter slide ${presenterLabel}`}
            className="min-h-9 shrink-0 rounded-xl bg-zinc-100 px-3 py-2 font-mono text-[11px] font-medium text-zinc-800 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs dark:bg-zinc-700/80 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Jump to presenter
          </button>

          <button
            type="button"
            onClick={onOpenQuestion}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-prsnt-primary px-3 py-2 font-mono text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-teal-800 sm:text-xs"
          >
            <MessageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Question
          </button>
        </div>
      </div>

      <p className="pointer-events-none max-w-[min(100%,24rem)] px-1 text-center font-mono text-[9px] leading-relaxed text-prsnt-ink/45 sm:max-w-none sm:text-[10px] dark:text-prsnt-ink/40">
        <span className="whitespace-normal sm:whitespace-nowrap">
          {followPresenter ? "Following presenter" : "Free browse — only you see this"}
        </span>
        <span className="mx-1 hidden opacity-60 sm:inline" aria-hidden>
          ·
        </span>
        <span className="hidden sm:inline">← → when Free</span>
      </p>
    </div>
  );
}
