import { type CSSProperties, type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/theme-toggle';
import { useHeaderScrolled } from '../hooks/use-header-scrolled';

const SESSION_CODE_RE = /^[A-Z2-9]{4,12}$/;

function LightningIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
		>
			<path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
		</svg>
	);
}

function MonitorIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<rect x="2" y="3" width="20" height="14" rx="2" />
			<path d="M8 21h8M12 17v4" />
		</svg>
	);
}

function PhoneIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<rect x="5" y="2" width="14" height="20" rx="2" />
			<path d="M12 18h.01" />
		</svg>
	);
}

function BoltChipIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
		>
			<path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
		</svg>
	);
}

function LockChipIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden
		>
			<rect x="3" y="11" width="18" height="11" rx="2" />
			<path d="M7 11V7a5 5 0 0110 0v4" />
		</svg>
	);
}

function UsersChipIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden
		>
			<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
		</svg>
	);
}

function ArrowRightIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden
		>
			<path
				d="M5 12h14M13 6l6 6-6 6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

const FEATURE_CHIPS = [
	{ label: 'Real-time sync', Icon: BoltChipIcon },
	{ label: 'View-only audience', Icon: LockChipIcon },
	{ label: 'Unlimited viewers', Icon: UsersChipIcon },
] as const;

function revealStyle(delayMs: number): CSSProperties {
	return { animationDelay: `${delayMs}ms` };
}

export function LandingPage() {
	const navigate = useNavigate();
	const headerScrolled = useHeaderScrolled();
	const [sessionCode, setSessionCode] = useState('');

	const normalized = sessionCode.trim().toUpperCase();
	const canJoin = SESSION_CODE_RE.test(normalized);

	function handleJoin(e: FormEvent) {
		e.preventDefault();
		if (!canJoin) return;
		navigate(`/view/${normalized}`);
	}

	return (
		<div className="relative isolate min-h-screen overflow-x-hidden bg-prsnt-surface font-sans text-prsnt-ink antialiased">
			<div
				className="pointer-events-none fixed inset-0 overflow-hidden"
				aria-hidden
			>
				<div className="absolute -left-32 top-[-10%] h-[min(70vw,28rem)] w-[min(70vw,28rem)] rounded-full bg-teal-200/50 blur-3xl motion-reduce:opacity-60 dark:bg-teal-900/25" />
				<div className="absolute -right-24 bottom-[-15%] h-[min(65vw,26rem)] w-[min(65vw,26rem)] rounded-full bg-sky-200/45 blur-3xl motion-reduce:opacity-60 dark:bg-sky-900/20" />
				<div
					className="absolute inset-0 opacity-[0.35]"
					style={{
						backgroundImage: `linear-gradient(115deg, transparent 40%, rgba(15, 118, 110, 0.06) 50%, transparent 60%)`,
					}}
				/>
			</div>

			<header
				className={`fixed top-0 left-0 right-0 z-20 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-200 ${
					headerScrolled ? 'prsnt-header-scrolled' : 'border-b border-transparent bg-transparent'
				}`}
			>
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:gap-4 md:px-6 md:py-4">
					<Link
						to="/"
						className="group flex cursor-pointer items-center gap-2.5 text-prsnt-ink transition-colors duration-200 hover:text-prsnt-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-prsnt-cta focus-visible:ring-offset-2 focus-visible:ring-offset-prsnt-surface rounded-lg"
					>
						<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-prsnt-primary/10 text-prsnt-primary transition-transform duration-200 motion-safe:group-hover:scale-105">
							<LightningIcon className="h-4 w-4" />
						</span>
						<span className="font-logo text-xl font-semibold tracking-wide">
							prsntrr
						</span>
					</Link>
					<div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 text-sm text-prsnt-ink/70">
						<span className="hidden font-medium lg:inline">Real-time deck sync</span>
						<span className="rounded-full border border-prsnt-primary/20 bg-white/80 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-prsnt-primary dark:bg-zinc-800/90">
							Beta
						</span>
						<ThemeToggle compact />
						<Link
							to="/login"
							className="prsnt-btn-secondary shrink-0 px-3 py-1.5 text-xs sm:text-sm"
						>
							Sign in
						</Link>
					</div>
				</div>
			</header>

			<main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-24 md:px-6 md:pt-28">
				<div className="mx-auto max-w-4xl text-center">
					<p
						className="landing-reveal mb-8 inline-flex  px-5 py-2 text-[0.8rem] font-regular uppercase tracking-[0.2em] text-prsnt-primary "
						style={revealStyle(40)}
					>
						Live presentations with prsntrr
					</p>
					<h1
						className="landing-reveal font-serif font-semibold leading-[1.05] tracking-tight text-prsnt-ink"
						style={{
							...revealStyle(100),
							fontSize: 'clamp(2.25rem, 6vw + 1rem, 4.25rem)',
							fontWeight: 600,
							letterSpacing: '-0.04em',
						}}
					>
						Present in sync,
						<br />
						<span className="bg-gradient-to-r from-prsnt-primary via-teal-600 to-prsnt-cta bg-clip-text text-transparent">
							everywhere.
						</span>
					</h1>
					<p
						className="landing-reveal mx-auto mt-8 max-w-xl text-lg font-light leading-relaxed text-prsnt-ink/80 md:text-xl"
						style={revealStyle(180)}
					>
						Start from your laptop. The room follows on any device — QR or code
						— with slides that stay locked to your pace.
					</p>
				</div>

				<div
					className="landing-reveal mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-x-8 md:gap-y-6 lg:gap-x-10"
					style={revealStyle(260)}
				>
					<section className="group relative overflow-hidden rounded-3xl border border-teal-900/10 bg-white/90 p-8 shadow-lg shadow-teal-900/[0.07] transition-[box-shadow,transform] duration-300 motion-safe:hover:shadow-xl motion-safe:hover:shadow-teal-900/10 dark:border-white/20 dark:bg-zinc-950/45 dark:shadow-2xl dark:shadow-black/50 dark:backdrop-blur-2xl dark:motion-safe:hover:shadow-black/60 dark:ring-1 dark:ring-inset dark:ring-white/10">
						<div
							className="pointer-events-none absolute inset-0 bg-gradient-to-br from-prsnt-primary/[0.03] via-transparent to-prsnt-cta/[0.04] dark:from-white/[0.06] dark:to-prsnt-primary/[0.04]"
							aria-hidden
						/>
						<div className="relative flex gap-5">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-prsnt-primary/15 to-prsnt-accent/10 text-prsnt-primary dark:border dark:border-white/10 dark:bg-white/5 dark:from-white/10 dark:to-prsnt-primary/10 dark:backdrop-blur-md">
								<MonitorIcon className="h-7 w-7" />
							</div>
							<div className="text-left">
								<h2 className="text-xl font-semibold tracking-tight text-prsnt-ink">
									Presenter
								</h2>
								<p className="mt-0.5 text-sm font-regular text-prsnt-ink/55">
									Laptop · Desktop
								</p>
							</div>
						</div>
						<p className="relative mt-6 text-left text-base leading-relaxed text-prsnt-ink/75">
							Sign in to build decks, open the presenter view, and share the
							session with everyone in the room.
						</p>
						<div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
							<Link
								to="/register"
								className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-prsnt-primary px-5 py-3.5 text-center text-sm font-semibold text-white shadow-md shadow-teal-900/15 transition-colors duration-200 hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-prsnt-cta focus-visible:ring-offset-2 dark:hover:bg-teal-600"
							>
								Sign up
								<ArrowRightIcon className="h-4 w-4 opacity-90" />
							</Link>
							<Link
								to="/login"
								className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-2xl border-2 border-prsnt-primary/25 bg-white/80 px-5 py-3.5 text-center text-sm font-semibold text-prsnt-ink transition-colors duration-200 hover:border-prsnt-primary/50 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-prsnt-cta focus-visible:ring-offset-2 dark:border-white/20 dark:bg-white/5 dark:backdrop-blur-md dark:hover:border-white/30 dark:hover:bg-white/10"
							>
								Sign in
							</Link>
						</div>
					</section>

					<div className="hidden items-stretch justify-center md:flex">
						<div className="relative flex w-px flex-1 bg-gradient-to-b from-transparent via-teal-900/15 to-transparent dark:via-white/15">
							<span className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 bg-prsnt-surface px-3 font-serif text-xs font-semibold uppercase tracking-[0.2em] text-prsnt-ink/40 dark:bg-zinc-950/80 dark:backdrop-blur-md dark:ring-1 dark:ring-white/10">
								or
							</span>
						</div>
					</div>

					<div className="flex justify-center md:hidden">
						<span className="font-serif text-xs font-semibold uppercase tracking-[0.25em] text-prsnt-ink/35">
							or
						</span>
					</div>

					<form
						onSubmit={handleJoin}
						className="relative overflow-hidden rounded-3xl border border-teal-900/10 bg-white/90 p-8 shadow-lg shadow-teal-900/[0.07] transition-[box-shadow,transform] duration-300 motion-safe:hover:shadow-xl motion-safe:hover:shadow-teal-900/10 dark:border-white/20 dark:bg-zinc-950/45 dark:shadow-2xl dark:shadow-black/50 dark:backdrop-blur-2xl dark:motion-safe:hover:shadow-black/60 dark:ring-1 dark:ring-inset dark:ring-white/10"
					>
						<div
							className="pointer-events-none absolute inset-0 bg-gradient-to-br from-prsnt-cta/[0.04] via-transparent to-prsnt-primary/[0.03] dark:from-sky-400/10 dark:to-prsnt-primary/10"
							aria-hidden
						/>
						<div className="relative flex gap-5">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-prsnt-cta/15 to-sky-300/20 text-prsnt-cta dark:border dark:border-white/10 dark:bg-white/5 dark:from-sky-400/15 dark:to-prsnt-cta/10 dark:backdrop-blur-md">
								<PhoneIcon className="h-7 w-7" />
							</div>
							<div className="text-left">
								<h2 className="text-xl font-semibold tracking-tight text-prsnt-ink font-serif">
									Join a session
								</h2>
								<p className="mt-0.5 text-sm font-regular text-prsnt-ink/55">
									Phone · Tablet
								</p>
							</div>
						</div>
						<p className="relative mt-6 text-left text-base leading-relaxed text-prsnt-ink/75">
							Enter the code from the presenter&apos;s screen. No install — you
							follow along in the browser.
						</p>
						<label className="relative mt-6 block text-left">
							<span className="text-[0.7rem] font-medium uppercase tracking-[0.15em] text-prsnt-ink/50">
								Session code
							</span>
							<input
								type="text"
								value={sessionCode}
								onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
								autoComplete="off"
								autoCapitalize="characters"
								spellCheck={false}
								maxLength={12}
								placeholder="e.g. AB3K7Z"
								aria-invalid={sessionCode.trim().length > 0 && !canJoin}
								className="mt-2 w-full rounded-2xl border border-teal-900/12 bg-white px-4 py-3.5 font-mono text-base font-medium tracking-[0.2em] text-prsnt-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-prsnt-ink/35 focus:border-prsnt-cta focus:outline-none focus:ring-2 focus:ring-prsnt-cta/25 dark:border-white/15 dark:bg-black/25 dark:backdrop-blur-md dark:placeholder:text-prsnt-ink/40"
							/>
						</label>
						<button
							type="submit"
							disabled={!canJoin}
							className="relative mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-prsnt-primary px-5 py-3.5 font-sans text-base font-semibold text-white shadow-md shadow-teal-900/20 transition-colors duration-200 hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-prsnt-cta focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-prsnt-ink/25 disabled:text-prsnt-ink/50 disabled:opacity-60 disabled:shadow-none dark:shadow-lg dark:shadow-black/30 dark:hover:bg-teal-600"
						>
							Join session
							<ArrowRightIcon className="h-4 w-4" />
						</button>
						{sessionCode.trim().length > 0 && !canJoin ? (
							<p
								className="mt-3 text-left text-xs font-medium text-amber-800 dark:text-amber-200"
								role="status"
							>
								Use 4–12 characters (A–Z and 2–9).
							</p>
						) : null}
					</form>
				</div>

				<div
					className="landing-reveal mx-auto mt-14 flex flex-wrap justify-center gap-3"
					style={revealStyle(380)}
				>
					{FEATURE_CHIPS.map(({ label, Icon }) => (
						<span
							key={label}
							className="inline-flex cursor-default items-center gap-2 rounded-full border border-prsnt-primary/10 bg-white/70 px-4 py-2 text-sm font-regular text-prsnt-ink shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60"
						>
							<Icon className="h-4 w-4 shrink-0 text-prsnt-primary" />
							{label}
						</span>
					))}
				</div>

				<p
					className="landing-reveal mt-14 text-center text-xs font-medium uppercase tracking-[0.2em] text-prsnt-ink/40"
					style={revealStyle(460)}
				>
					weraldco · TOY · 2026
				</p>
			</main>
		</div>
	);
}
