import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

export const roomHotspotClass =
  "absolute z-20 rounded-2xl bg-transparent transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90";

export const roomImageLabelClass =
  "pointer-events-none whitespace-nowrap rounded-full border border-white/90 bg-[rgba(229,236,222,0.94)] px-3 py-1.5 text-[13px] font-semibold leading-none tracking-wide text-[#284334] shadow-[0_7px_18px_rgba(32,53,42,0.3)] backdrop-blur-md transition duration-200 group-hover:bg-[#f4f7ef] group-focus-visible:bg-[#f4f7ef]";

export function RoomHotspotMarker({
  label,
  className = "left-1/2 top-1/2",
  labelPosition = "below",
}: {
  label: string;
  className?: string;
  labelPosition?: "below" | "below-left" | "left" | "right";
}) {
  const labelPositionClass =
    labelPosition === "left"
      ? "right-[calc(100%+6px)] top-1/2 -translate-y-1/2"
      : labelPosition === "right"
        ? "left-[calc(100%+6px)] top-1/2 -translate-y-1/2"
        : labelPosition === "below-left"
          ? "right-0 top-[calc(100%+6px)]"
          : "left-1/2 top-[calc(100%+6px)] -translate-x-1/2";

  return (
    <span className={`pointer-events-none absolute z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 ${className}`}>
      <span className={`absolute ${roomImageLabelClass} ${labelPositionClass}`}>
        {label}
      </span>
    </span>
  );
}

export function RoomSceneHeader({ roomName }: { roomName: string }) {
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
        <p className="text-base font-semibold tracking-tight text-slate-900">{roomName}</p>
      </div>
      <span className="h-10 w-10" aria-hidden="true" />
    </header>
  );
}
