import Link from "next/link";
import { ArrowLeft, Briefcase, Car, FileText, Home, Plane, Plus, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const coveredItems = [
  { label: "Travel Insurance", status: "Valid" },
  { label: "Passports", status: "All valid" },
  { label: "Holiday Bookings", status: "No upcoming" },
  { label: "Travel Docs", status: "Good" },
];

const shelves = [
  { label: "Insurance", icon: ShieldCheck },
  { label: "Passports", icon: Plane },
  { label: "Bookings", icon: Briefcase },
  { label: "Travel Docs", icon: FileText },
];

export function DrivewayPage() {
  return (
    <main className="min-h-svh bg-[#f5efe6] pb-28 text-[#251b12]">
      <div className="mx-auto min-h-svh w-full max-w-[430px] bg-[#f5efe6]">
        <section className="relative h-[280px] w-full overflow-hidden rounded-b-[28px] bg-[linear-gradient(135deg,#17202a_0%,#34402e_48%,#15100c_100%)] text-white shadow-xl shadow-stone-300/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(255,211,140,0.34),transparent_22%),radial-gradient(circle_at_45%_80%,rgba(255,255,255,0.14),transparent_18%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.22)_44%,rgba(0,0,0,0.72)_100%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute bottom-5 left-1/2 h-40 w-20 -translate-x-1/2 rounded-t-full bg-white/12 blur-[2px]" />
          <div className="absolute bottom-8 right-7 h-20 w-28 rounded-t-[2rem] bg-[linear-gradient(180deg,#3d4038,#171a19)] shadow-2xl shadow-black/40" />
          <div className="absolute bottom-6 right-10 h-7 w-22 rounded-b-xl bg-black/55" />
          <div className="absolute bottom-4 left-8 h-24 w-24 rounded-full bg-green-900/30 blur-2xl" />
          <div className="absolute bottom-9 right-24 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />

          <div className="relative z-10 flex items-center justify-between px-5 pt-5">
            <Link
              href="/dashboard"
              className="grid h-11 w-11 place-items-center rounded-full bg-black/28 backdrop-blur-md"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link
              href="/add"
              className="grid h-11 w-11 place-items-center rounded-full bg-black/28 backdrop-blur-md"
              aria-label="Add"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>

          <div className="absolute bottom-12 left-5 z-10">
            <h1 className="text-4xl font-bold tracking-normal">Driveway</h1>
            <p className="mt-2 text-sm font-semibold text-white/86">Travel & Adventures</p>
          </div>
        </section>

        <div className="relative z-20 -mt-10 px-4">
          <section className="rounded-[28px] bg-white p-4 shadow-xl shadow-stone-300/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-stone-500">Room Readiness</p>
                <h2 className="mt-1 text-3xl font-bold text-emerald-700">82%</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                On Track
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-[82%] rounded-full bg-emerald-600" />
            </div>
          </section>

          <section className="mt-4 rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
            <h2 className="text-base font-bold">What&apos;s Covered</h2>
            <div className="mt-3 divide-y divide-stone-100">
              {coveredItems.map((item) => (
                <div key={item.label} className="flex min-h-12 items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-bold">{item.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-stone-500">{item.status}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
            <h2 className="text-base font-bold">Document Shelves</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {shelves.map((shelf) => (
                <div key={shelf.label} className="min-h-28 rounded-[20px] bg-[#fbf7ef] p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                    <shelf.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold">{shelf.label}</h3>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Link
        href="/add"
        className="fixed bottom-24 right-[max(1.25rem,calc((100vw-430px)/2+1.25rem))] z-40 grid h-14 w-14 place-items-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-900/30"
        aria-label="Add"
      >
        <Plus className="h-7 w-7" />
      </Link>
      <BottomNav />
    </main>
  );
}
