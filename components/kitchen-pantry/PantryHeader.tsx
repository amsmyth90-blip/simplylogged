import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

export function PantryHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back">
          <UiIcon name="arrow-left" className="h-4 w-4" />
        </button>
      ) : (
        <Link href="/room/kitchen" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-xl" aria-label="Back to Kitchen">
          <UiIcon name="arrow-left" className="h-4 w-4" />
        </Link>
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">Kitchen</p>
        <h1 className="truncate text-xl font-semibold tracking-tight">Pantry & shopping</h1>
      </div>
    </header>
  );
}
