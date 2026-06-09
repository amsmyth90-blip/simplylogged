import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Plus } from "lucide-react";

export type HeroScene =
  | "garage"
  | "office"
  | "lounge"
  | "vault"
  | "garden"
  | "driveway"
  | "bedroom"
  | "attic"
  | "mailbox";

const heroStyles: Record<HeroScene, string> = {
  garage:
    "bg-[radial-gradient(circle_at_72%_62%,rgba(245,158,11,0.20),transparent_20%),linear-gradient(135deg,#15130f,#322417_48%,#090909)]",
  office:
    "bg-[radial-gradient(circle_at_75%_20%,rgba(251,191,36,0.22),transparent_18%),linear-gradient(135deg,#17110d,#3a2619_48%,#0f1115)]",
  lounge:
    "bg-[radial-gradient(circle_at_72%_18%,rgba(252,211,77,0.24),transparent_20%),linear-gradient(135deg,#21160f,#57331f_52%,#12100d)]",
  vault:
    "bg-[radial-gradient(circle_at_50%_40%,rgba(217,119,6,0.22),transparent_22%),linear-gradient(135deg,#0f0d0b,#30251d_48%,#050505)]",
  garden:
    "bg-[radial-gradient(circle_at_70%_25%,rgba(190,242,100,0.2),transparent_22%),linear-gradient(135deg,#142015,#324323_48%,#10110d)]",
  driveway:
    "bg-[radial-gradient(circle_at_70%_30%,rgba(251,191,36,0.2),transparent_20%),linear-gradient(135deg,#17202a,#36402c_48%,#0f1214)]",
  bedroom:
    "bg-[radial-gradient(circle_at_70%_18%,rgba(253,230,138,0.24),transparent_22%),linear-gradient(135deg,#211813,#4b3224_48%,#15110e)]",
  attic:
    "bg-[radial-gradient(circle_at_78%_18%,rgba(251,191,36,0.26),transparent_18%),linear-gradient(135deg,#20130b,#573114_50%,#120d08)]",
  mailbox:
    "bg-[radial-gradient(circle_at_68%_42%,rgba(248,113,113,0.14),transparent_18%),linear-gradient(135deg,#182015,#42522d_48%,#1b130d)]",
};

export function RoomHero({
  title,
  subtitle,
  eyebrow,
  scene,
  backHref = "/dashboard",
  addHref = "/add",
  showAdd = true,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  scene: HeroScene;
  backHref?: string;
  addHref?: string;
  showAdd?: boolean;
}) {
  return (
    <section
      className={`relative h-[38svh] min-h-[20rem] max-h-[23.5rem] overflow-hidden rounded-b-[2rem] ${heroStyles[scene]} px-5 pb-20 pt-5 text-white shadow-2xl shadow-stone-400/40`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.68))]" />
      <HeroArtwork scene={scene} />
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href={backHref}
          className="grid h-11 w-11 place-items-center rounded-full bg-black/24 backdrop-blur-md"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {showAdd ? (
          <Link
            href={addHref}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/24 backdrop-blur-md"
            aria-label="Add"
          >
            <Plus className="h-5 w-5" />
          </Link>
        ) : (
          <button
            className="grid h-11 w-11 place-items-center rounded-full bg-black/24 backdrop-blur-md"
            aria-label="More"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="absolute bottom-20 left-5 z-10">
        <p className="text-sm font-semibold text-white/84">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal">{title}</h1>
        <p className="mt-2 max-w-[18rem] text-sm font-medium leading-6 text-white/82">
          {subtitle}
        </p>
      </div>
    </section>
  );
}

function HeroArtwork({ scene }: { scene: HeroScene }) {
  if (scene === "garage") {
    return (
      <>
        <div className="absolute bottom-16 right-8 h-20 w-44 rounded-[50%] bg-black/45 blur-xl" />
        <div className="absolute bottom-24 right-7 h-16 w-44 rounded-t-[2.4rem] bg-[linear-gradient(180deg,#4a4640,#141414)] ring-1 ring-white/10" />
        <div className="absolute bottom-20 right-11 h-8 w-36 rounded-b-2xl bg-black/70" />
        <span className="absolute bottom-[4.5rem] right-16 h-9 w-9 rounded-full bg-zinc-950 ring-4 ring-zinc-700" />
        <span className="absolute bottom-[4.5rem] right-36 h-9 w-9 rounded-full bg-zinc-950 ring-4 ring-zinc-700" />
      </>
    );
  }

  if (scene === "vault") {
    return (
      <div className="absolute bottom-14 right-10 h-40 w-32 rounded-[1.8rem] border border-amber-200/20 bg-[radial-gradient(circle,#6b5a44_0,#221b15_48%,#090807_100%)] shadow-2xl shadow-black">
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-200/40" />
      </div>
    );
  }

  if (scene === "mailbox") {
    return (
      <>
        <div className="absolute bottom-20 right-8 h-28 w-32 rounded-t-[3rem] bg-[linear-gradient(180deg,#233320,#0f1710)] shadow-2xl shadow-black/40 ring-1 ring-white/10" />
        <div className="absolute bottom-20 right-8 h-12 w-32 rounded-b-2xl bg-black/30" />
        <div className="absolute bottom-24 right-4 h-2 w-20 bg-red-500" />
        <div className="absolute bottom-28 right-2 h-12 w-2 rounded-full bg-red-600" />
      </>
    );
  }

  if (scene === "garden" || scene === "driveway") {
    return (
      <>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-8 left-1/2 h-44 w-20 -translate-x-1/2 rounded-t-full bg-white/10 blur-sm" />
        <div className="absolute bottom-4 left-8 h-24 w-24 rounded-full bg-green-700/30 blur-2xl" />
        <div className="absolute bottom-8 right-8 h-28 w-28 rounded-full bg-amber-500/20 blur-2xl" />
      </>
    );
  }

  return (
    <>
      <div className="absolute bottom-10 left-7 h-20 w-28 rounded-t-[2rem] bg-white/12 ring-1 ring-white/10" />
      <div className="absolute bottom-10 right-7 h-28 w-24 rounded-t-[1.6rem] bg-white/10 ring-1 ring-white/10" />
      <div className="absolute right-12 top-14 grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="h-5 w-5 rounded bg-amber-100/12" />
        ))}
      </div>
    </>
  );
}
