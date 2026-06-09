import Link from "next/link";
import { Activity, Crown, ShieldCheck, UserPlus, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const family = [
  { name: "Amy Smith", role: "You", access: "Owner", tone: "violet" },
  { name: "James Smith", role: "Husband", access: "Admin", tone: "amber" },
  { name: "Emily Smith", role: "Daughter", access: "Member", tone: "green" },
  { name: "Daniel Smith", role: "Son", access: "Member", tone: "green" },
];

const activity = [
  "Amy uploaded Home Insurance",
  "James completed MOT reminder",
  "Emily added Passport",
];

export default function FamilyPage() {
  return (
    <main className="min-h-svh bg-[#f5efe6] pb-28 text-[#261c14]">
      <section className="relative min-h-[21rem] overflow-hidden rounded-b-[2rem] bg-[radial-gradient(circle_at_72%_24%,rgba(251,191,36,0.18),transparent_20%),linear-gradient(135deg,#21160f,#57331f_52%,#12100d)] px-5 pb-20 pt-5 text-white shadow-2xl shadow-stone-400/40">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.62))]" />
        <div className="absolute bottom-10 left-8 h-24 w-40 rounded-t-[2rem] bg-white/12 ring-1 ring-white/10" />
        <div className="absolute right-10 top-16 grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="h-7 w-7 rounded bg-amber-100/12" />
          ))}
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-white/82">Your team, your estate</p>
            <h1 className="mt-2 text-4xl font-bold">Family Hub</h1>
          </div>
          <Link href="/account" className="grid h-11 w-11 place-items-center rounded-full bg-black/24 backdrop-blur-md" aria-label="Invite family">
            <UserPlus className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <div className="relative z-20 mx-auto -mt-12 max-w-md px-4">
        <section className="rounded-[1.35rem] bg-white p-4 shadow-xl shadow-stone-300/50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Family Members</h2>
            <Link href="/account" className="text-sm font-bold text-violet-700">+ Invite</Link>
          </div>
          <div className="space-y-3">
            {family.map((person) => (
              <article key={person.name} className="flex min-h-14 items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-full ${avatarTone(person.tone)} text-white`}>
                    {person.access === "Owner" ? <Crown className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">{person.name}</h3>
                    <p className="text-sm text-stone-500">{person.role}</p>
                  </div>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">{person.access}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-700" />
              <h2 className="font-bold">Recent Activity</h2>
            </div>
            <Link href="/account" className="text-sm font-bold text-violet-700">View all</Link>
          </div>
          <div className="space-y-3">
            {activity.map((item, index) => (
              <div key={item} className="flex min-h-12 items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item}</p>
                  <p className="text-sm text-stone-500">{index + 1}d ago</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Link href="/account" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-white text-base font-bold shadow-sm shadow-stone-200">
          <UserPlus className="h-5 w-5 text-violet-700" />
          Manage permissions
        </Link>
      </div>
      <BottomNav />
    </main>
  );
}

function avatarTone(tone: string) {
  if (tone === "amber") return "bg-amber-600";
  if (tone === "green") return "bg-emerald-600";
  return "bg-violet-600";
}
