import { Link } from "react-router-dom";
import { AppShell } from "../components/app-shell";

export function LandingPage() {
  return (
    <AppShell>
      <div className="space-y-10">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-400">Phase 1 MVP</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Present together, in real time
          </h1>
          <p className="max-w-2xl text-lg text-zinc-400">
            Create a session, share a link or QR code, and keep every viewer on the same slide with
            Socket.io sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-xl bg-indigo-500 px-5 py-2.5 font-medium text-white hover:bg-indigo-400"
          >
            Get started
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl border border-zinc-700 px-5 py-2.5 font-medium text-zinc-200 hover:bg-zinc-900"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
