import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type EstateHotspotProps = {
  name: string;
  href: string;
  left: string;
  top: string;
  icon: LucideIcon;
  status: "secure" | "due-soon" | "attention";
  count?: number;
};

export function EstateHotspot({
  name,
  href,
  left,
  top,
  icon: Icon,
  status,
  count,
}: EstateHotspotProps) {
  return (
    <Link
      href={href}
      className="glass absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full px-2 py-1.5 text-[clamp(8px,2.45vw,10px)] font-semibold text-zinc-900 shadow transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/80"
      style={{ left, top }}
      aria-label={name}
    >
      <Icon className="h-[1.05em] w-[1.05em] text-violet-700" strokeWidth={2.4} />
      <span className="max-w-[min(5.4rem,24vw)] truncate">{name}</span>
      {count ? (
        <span className="ml-0.5 grid min-h-3.5 min-w-3.5 place-items-center rounded-full bg-rose-500 px-1 text-[8px] font-bold leading-none text-white">
          {count}
        </span>
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "secure"
              ? "bg-emerald-500"
              : status === "due-soon"
                ? "bg-amber-400"
                : "bg-rose-500"
          }`}
        />
      )}
    </Link>
  );
}
