"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Car,
  CheckCircle2,
  FileText,
  Flower2,
  Home,
  KeyRound,
  Landmark,
  Plane,
  Plus,
  ShieldCheck,
  Sofa,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import type { StoredDocument, StoredReminder } from "@/lib/storage";
import { getDocumentsByRoom } from "@/lib/supabase/documents";
import { getRemindersByRoom } from "@/lib/supabase/reminders";

type RoomPageProps = {
  roomId: string;
  room: {
    title: string;
    description: string;
    documents: readonly string[];
    reminders: readonly string[];
    actions: readonly string[];
  };
};

const roomDesigns = {
  garage: {
    eyebrow: "Vehicle bay",
    hero: "Garage",
    Icon: Car,
    gradient: "from-zinc-950 via-stone-900 to-slate-700",
    glow: "bg-amber-300/25",
    readiness: [
      ["MOT", "ok"],
      ["Insurance", "ok"],
      ["Service", "warn"],
    ],
    shelves: ["Vehicle dashboard", "Vehicle documents shelf", "Service history shelf"],
  },
  office: {
    eyebrow: "Executive office",
    hero: "Office",
    Icon: BriefcaseBusiness,
    gradient: "from-slate-950 via-indigo-950 to-stone-800",
    glow: "bg-sky-300/20",
    readiness: [
      ["Mortgage", "ok"],
      ["Pension", "warn"],
      ["Contracts", "ok"],
    ],
    shelves: ["Mortgage section", "Pension section", "Investments section", "Financial shelves"],
  },
  "family-room": {
    eyebrow: "Household lounge",
    hero: "Family Room",
    Icon: Sofa,
    gradient: "from-stone-900 via-rose-950 to-amber-800",
    glow: "bg-orange-200/25",
    readiness: [
      ["Home cover", "ok"],
      ["Utilities", "ok"],
      ["Warranties", "warn"],
    ],
    shelves: ["Family records", "Home insurance", "Utilities", "Warranties", "Shared household information"],
  },
  "safe-room": {
    eyebrow: "Secure chamber",
    hero: "Safe Room",
    Icon: ShieldCheck,
    gradient: "from-zinc-950 via-violet-950 to-black",
    glow: "bg-violet-300/25",
    readiness: [
      ["Will", "ok"],
      ["Life cover", "ok"],
      ["Power of attorney", "warn"],
    ],
    shelves: ["Will", "Life insurance", "Power of attorney", "Emergency contacts", "Funeral wishes"],
  },
  garden: {
    eyebrow: "Garden records",
    hero: "Garden",
    Icon: Flower2,
    gradient: "from-emerald-950 via-lime-900 to-stone-800",
    glow: "bg-lime-200/25",
    readiness: [
      ["Pets", "ok"],
      ["Equipment", "warn"],
      ["Care plans", "ok"],
    ],
    shelves: ["Pets section", "Outdoor equipment", "Gardening records"],
  },
  driveway: {
    eyebrow: "Travel hub",
    hero: "Driveway",
    Icon: Plane,
    gradient: "from-sky-950 via-blue-900 to-slate-800",
    glow: "bg-sky-200/25",
    readiness: [
      ["Holidays", "ok"],
      ["Insurance", "warn"],
      ["Bookings", "ok"],
    ],
    shelves: ["Holidays", "Travel insurance", "Passports", "Booking confirmations"],
  },
  bedroom: {
    eyebrow: "Personal suite",
    hero: "Bedroom",
    Icon: KeyRound,
    gradient: "from-purple-950 via-fuchsia-950 to-stone-800",
    glow: "bg-pink-200/20",
    readiness: [
      ["Identity", "ok"],
      ["Medical", "warn"],
      ["Qualifications", "ok"],
    ],
    shelves: ["Personal records", "Identity documents", "Medical records", "Qualifications"],
  },
  attic: {
    eyebrow: "Memories archive",
    hero: "Attic",
    Icon: Home,
    gradient: "from-stone-950 via-neutral-800 to-amber-900",
    glow: "bg-amber-200/20",
    readiness: [
      ["Archive", "ok"],
      ["History", "ok"],
      ["Review", "warn"],
    ],
    shelves: ["Memories archive", "Historical documents", "Archived records"],
  },
} as const;

export function RoomPage({ roomId, room }: RoomPageProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [reminders, setReminders] = useState<StoredReminder[]>([]);
  const design = roomDesigns[roomId as keyof typeof roomDesigns] ?? roomDesigns.attic;

  useEffect(() => {
    async function refresh() {
      setDocuments(await getDocumentsByRoom(roomId));
      setReminders(await getRemindersByRoom(roomId));
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, [roomId]);

  const readinessScore = useMemo(
    () => Math.min(99, 62 + documents.length * 8 + reminders.filter((item) => item.completed).length * 4),
    [documents, reminders],
  );

  return (
    <main className="min-h-svh overflow-hidden bg-zinc-950 px-4 pb-28 pt-4 text-white">
      <div className={`pointer-events-none fixed inset-0 bg-gradient-to-br ${design.gradient}`} />
      <div className={`pointer-events-none fixed left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full ${design.glow} blur-3xl`} />
      <div className="relative mx-auto max-w-md">
        <header className="glass sticky top-4 z-20 flex items-center gap-3 rounded-[1.5rem] px-3 py-3">
          <Link
            href="/dashboard"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-zinc-950"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 text-zinc-950">
            <p className="text-xs font-semibold text-violet-700">Digital Estate</p>
            <h1 className="truncate text-xl font-bold">{room.title}</h1>
          </div>
        </header>

        <section className="relative mt-5 min-h-72 overflow-hidden rounded-[2rem] border border-white/18 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-2xl">
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.42))]" />
          <div className="absolute bottom-6 left-7 right-7 h-16 rounded-[50%] bg-black/25 blur-xl" />
          <div className="absolute bottom-10 left-8 right-8 grid grid-cols-3 gap-3">
            <EnvironmentPanel />
            <EnvironmentPanel tall />
            <EnvironmentPanel />
          </div>
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/65">{design.eyebrow}</p>
            <h2 className="mt-2 text-4xl font-bold">{design.hero}</h2>
            <p className="mt-3 max-w-[16rem] text-sm leading-6 text-white/76">{room.description}</p>
          </div>
          <div className="absolute right-5 top-5 grid h-16 w-16 place-items-center rounded-3xl bg-white/18 backdrop-blur-xl">
            <design.Icon className="h-8 w-8 text-white" />
          </div>
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-white/14 bg-white/12 p-4 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Readiness</p>
              <h3 className="mt-1 text-2xl font-bold">{readinessScore}%</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {design.readiness.map(([label, state]) => (
                <ReadinessPill key={label} label={label} state={state} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3">
          {design.shelves.map((shelf) => (
            <DocumentShelf key={shelf} title={shelf} documents={documents} fallbackItems={room.documents} />
          ))}
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-white/14 bg-white/12 p-4 backdrop-blur-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-200" />
              <h3 className="text-sm font-bold">Room reminders</h3>
            </div>
            <Link href="/add" className="grid h-9 w-9 place-items-center rounded-full bg-violet-600">
              <Plus className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {reminders.length ? (
              reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between rounded-2xl bg-white/10 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{reminder.title}</p>
                    <p className="text-xs text-white/55">{formatDate(reminder.dueDate)}</p>
                  </div>
                  <CalendarClock className="h-4 w-4 text-amber-200" />
                </div>
              ))
            ) : (
              room.reminders.map((reminder) => (
                <div key={reminder} className="flex items-center justify-between rounded-2xl bg-white/10 p-3 text-sm">
                  <span>{reminder}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
              ))
            )}
          </div>
        </section>

        <Link
          href="/add"
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-white px-5 py-4 text-sm font-bold text-zinc-950 shadow-xl shadow-black/20"
        >
          <Plus className="h-5 w-5" />
          Add to {room.title}
        </Link>
      </div>
      <BottomNav />
    </main>
  );
}

function EnvironmentPanel({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`rounded-t-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.06))] ${
        tall ? "h-32" : "mt-8 h-24"
      }`}
    />
  );
}

function ReadinessPill({ label, state }: { label: string; state: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 px-2.5 py-2 text-center">
      <span className={`mx-auto block h-2 w-2 rounded-full ${state === "ok" ? "bg-emerald-300" : "bg-amber-300"}`} />
      <p className="mt-1 max-w-16 truncate text-[10px] font-bold text-white/80">{label}</p>
    </div>
  );
}

function DocumentShelf({
  title,
  documents,
  fallbackItems,
}: {
  title: string;
  documents: StoredDocument[];
  fallbackItems: readonly string[];
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/14 bg-white/12 p-4 backdrop-blur-2xl">
      <div className="mb-3 flex items-center gap-2">
        <Landmark className="h-4 w-4 text-amber-200" />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {documents.length ? (
          documents.map((document) => <DocumentSpine key={`${title}-${document.id}`} document={document} />)
        ) : (
          fallbackItems.slice(0, 3).map((item) => <FallbackSpine key={`${title}-${item}`} title={item} />)
        )}
      </div>
    </section>
  );
}

function DocumentSpine({ document }: { document: StoredDocument }) {
  return (
    <article className="w-44 shrink-0 rounded-[1.2rem] bg-white/90 p-3 text-zinc-950 shadow-lg shadow-black/15">
      <FileText className="h-5 w-5 text-violet-700" />
      <h4 className="mt-3 line-clamp-2 text-sm font-bold">{document.title}</h4>
      <p className="mt-1 truncate text-xs text-zinc-500">{document.category}</p>
    </article>
  );
}

function FallbackSpine({ title }: { title: string }) {
  return (
    <article className="w-36 shrink-0 rounded-[1.2rem] bg-white/12 p-3 text-white ring-1 ring-white/10">
      <FileText className="h-5 w-5 text-amber-200" />
      <h4 className="mt-3 line-clamp-2 text-sm font-bold">{title}</h4>
      <p className="mt-1 text-xs text-white/50">Template shelf</p>
    </article>
  );
}

function formatDate(value: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`));
}
