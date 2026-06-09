import { Bell, House } from "lucide-react";

export function AppHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
      <div className="glass pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-[1.75rem] px-3 py-3 text-zinc-950">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/70 text-violet-700 shadow-sm">
            <House className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-600">Good morning, Amy</p>
            <h1 className="truncate text-base font-bold tracking-normal">
              Simply Logged
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">
            Ready 94%
          </span>
          <button
            className="relative grid h-10 w-10 place-items-center rounded-full bg-white/70 shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-zinc-800" />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-white bg-rose-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
