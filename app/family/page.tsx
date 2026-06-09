import { ShieldCheck, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const family = ["Amy", "Mum", "Noah", "Trusted solicitor"];

export default function FamilyPage() {
  return (
    <main className="min-h-svh bg-slate-100 px-4 pb-28 pt-5 text-zinc-950">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-bold text-violet-700">Simply Logged</p>
        <h1 className="text-3xl font-bold">Family</h1>
        <section className="mt-5 rounded-[1.75rem] bg-white p-4 shadow-lg shadow-slate-300/40">
          <Users className="h-7 w-7 text-violet-700" />
          <h2 className="mt-3 text-xl font-bold">Trusted circle</h2>
          <p className="mt-1 text-sm text-zinc-600">Manage who can see, help, and step in when needed.</p>
        </section>
        <div className="mt-4 space-y-3">
          {family.map((person) => (
            <div key={person} className="flex items-center justify-between rounded-[1.25rem] bg-white p-4 shadow-sm">
              <span className="text-sm font-semibold">{person}</span>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
