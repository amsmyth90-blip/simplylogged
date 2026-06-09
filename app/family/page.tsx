import Link from "next/link";
import { Activity, Crown, ShieldCheck, UserPlus, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const family = [
  { name: "Amy", role: "Owner", access: "Full estate", tone: "violet" },
  { name: "James", role: "Trusted helper", access: "Garage, Office", tone: "blue" },
  { name: "Emily", role: "Family member", access: "Bedroom, Travel", tone: "pink" },
  { name: "Solicitor", role: "Professional", access: "Safe Room", tone: "amber" },
];

const activity = [
  "Amy uploaded Home Insurance",
  "James completed MOT reminder",
  "Emily added Passport",
  "Solicitor reviewed Will",
];

const sharedDocs = ["Home Insurance", "Emergency contacts", "Travel booking", "MOT certificate"];

export default function FamilyPage() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#111827] px-4 pb-28 pt-5 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,207,232,0.25),transparent_30%),radial-gradient(circle_at_15%_25%,rgba(167,139,250,0.2),transparent_26%),linear-gradient(180deg,#1f1726,#111827)]" />
      <div className="relative mx-auto max-w-md">
        <header>
          <p className="text-sm font-bold text-pink-200">Family Command Centre</p>
          <h1 className="text-3xl font-bold">Family</h1>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-2xl">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-pink-300/25 blur-3xl" />
          <div className="relative">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/15">
              <Users className="h-8 w-8 text-pink-100" />
            </div>
            <h2 className="mt-5 text-2xl font-bold">Trusted circle</h2>
            <p className="mt-2 max-w-[16rem] text-sm leading-6 text-white/68">
              Shared access, permissions, and quiet activity across the estate.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-white/14 bg-white/12 p-4 backdrop-blur-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Estate readiness</h2>
            <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-xs font-bold text-emerald-200">
              4 active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Signal label="Access" ok />
            <Signal label="Contacts" ok />
            <Signal label="Permissions" />
          </div>
        </section>

        <section className="mt-4 space-y-3">
          {family.map((person) => (
            <article key={person.name} className="rounded-[1.5rem] border border-white/14 bg-white/12 p-4 backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-12 w-12 place-items-center rounded-full ${avatarTone(person.tone)} text-white`}>
                    {person.role === "Owner" ? <Crown className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold">{person.name}</h3>
                    <p className="text-xs text-white/55">{person.role}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">
                  {person.access}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-white/14 bg-white/12 p-4 backdrop-blur-2xl">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-pink-200" />
            <h2 className="text-sm font-bold">Activity timeline</h2>
          </div>
          <div className="space-y-2">
            {activity.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-pink-200" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-white/14 bg-white/12 p-4 backdrop-blur-2xl">
          <h2 className="text-sm font-bold">Shared documents</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {sharedDocs.map((doc) => (
              <div key={doc} className="rounded-2xl bg-white/10 p-3 text-sm font-bold text-white/80">
                {doc}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/account" className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-4 text-sm font-bold text-zinc-950">
            <UserPlus className="h-4 w-4" />
            Invite
          </Link>
          <Link href="/account" className="rounded-full bg-white/10 px-4 py-4 text-center text-sm font-bold text-white ring-1 ring-white/15">
            Permissions
          </Link>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}

function Signal({ label, ok = false }: { label: string; ok?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <span className={`mx-auto block h-2 w-2 rounded-full ${ok ? "bg-emerald-300" : "bg-amber-300"}`} />
      <p className="mt-1 truncate text-[10px] font-bold text-white/68">{label}</p>
    </div>
  );
}

function avatarTone(tone: string) {
  if (tone === "blue") return "bg-blue-500";
  if (tone === "pink") return "bg-pink-500";
  if (tone === "amber") return "bg-amber-500";
  return "bg-violet-600";
}
