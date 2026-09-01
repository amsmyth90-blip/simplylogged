import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

export const roomHotspotClass =
  "absolute z-20 bg-transparent focus-visible:outline-none";

export const roomImageLabelClass =
  "whitespace-nowrap rounded-full border border-white/90 bg-[rgba(229,236,222,0.94)] px-3 py-1.5 text-[13px] font-semibold leading-none tracking-wide text-[#284334] shadow-[0_7px_18px_rgba(32,53,42,0.3)] backdrop-blur-md transition duration-300 group-hover:bg-[#f4f7ef] group-focus-visible:bg-[#f4f7ef]";

export function RoomSceneHeader({
  roomName,
  eyebrow,
}: {
  roomName: string;
  eyebrow?: string;
}) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
      <Link
        href="/dashboard"
        aria-label="Return to Home"
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/60 text-slate-800 shadow-lg backdrop-blur-xl"
      >
        <UiIcon name="arrow-left" className="h-5 w-5" />
      </Link>
      <div className="rounded-full border border-white/55 bg-white/60 px-4 py-2 text-center shadow-lg backdrop-blur-xl">
        {eyebrow ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            {eyebrow}
          </p>
        ) : null}
        <p className="text-base font-semibold tracking-tight text-slate-900">{roomName}</p>
      </div>
      <span className="h-10 w-10" aria-hidden="true" />
    </header>
  );
}
