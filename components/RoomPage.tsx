"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, CheckCircle2 } from "lucide-react";
import { CoverageList } from "@/components/internal/CoverageList";
import { DocumentShelf } from "@/components/internal/DocumentShelf";
import { EstateBottomNav } from "@/components/internal/EstateBottomNav";
import { FloatingAddButton } from "@/components/internal/FloatingAddButton";
import { PageShell } from "@/components/internal/PageShell";
import { ReadinessCard } from "@/components/internal/ReadinessCard";
import { RoomHero, type HeroScene } from "@/components/internal/RoomHero";
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
    eyebrow: "Vehicles & Transport",
    subtitle: "MOT, insurance, tax and service history",
    scene: "garage",
    readiness: 92,
    covered: [
      ["MOT", "Valid until 12 Sep 2026", "ok"],
      ["Insurance", "Expires 1 Jun 2027", "ok"],
      ["Service History", "Attention soon", "warn"],
    ],
    shelves: ["Insurance Documents", "MOT & Road Tax", "Service History", "Vehicle Records"],
  },
  office: {
    eyebrow: "Finance & Investments",
    subtitle: "Mortgage, pension, investments and contracts",
    scene: "office",
    readiness: 78,
    covered: [
      ["Mortgage", "On track", "ok"],
      ["Pension", "Review needed", "warn"],
      ["Investments", "On track", "ok"],
      ["Tax", "Up to date", "ok"],
    ],
    shelves: ["Mortgage & Property", "Pensions & Retirement", "Investments", "Tax & Accounts"],
  },
  "family-room": {
    eyebrow: "Home & Household",
    subtitle: "Home cover, utilities, warranties and shared information",
    scene: "lounge",
    readiness: 88,
    covered: [
      ["Home Insurance", "Valid", "ok"],
      ["Utilities", "All up to date", "ok"],
      ["Warranties", "2 expiring soon", "warn"],
      ["Household Docs", "Good", "ok"],
    ],
    shelves: ["Family Records", "Home Insurance", "Utilities", "Warranties"],
  },
  "safe-room": {
    eyebrow: "Security & Legacy",
    subtitle: "Will, life cover, power of attorney and wishes",
    scene: "vault",
    readiness: 90,
    covered: [
      ["Will", "On file", "ok"],
      ["Life Insurance", "Active", "ok"],
      ["Power of Attorney", "Review", "warn"],
      ["Funeral Wishes", "On file", "ok"],
    ],
    shelves: ["Will", "Life Insurance", "Power of Attorney", "Emergency Contacts"],
  },
  garden: {
    eyebrow: "Outdoor & Pets",
    subtitle: "Pets, outdoor equipment and gardening records",
    scene: "garden",
    readiness: 75,
    covered: [
      ["Pets", "Up to date", "ok"],
      ["Outdoor Equipment", "Service due", "warn"],
      ["Gardening Records", "Good", "ok"],
      ["Landscaping", "Good", "ok"],
    ],
    shelves: ["Pets", "Outdoor Equipment", "Gardening Records", "Greenhouse Notes"],
  },
  driveway: {
    eyebrow: "Travel & Adventures",
    subtitle: "Holidays, travel insurance and bookings",
    scene: "driveway",
    readiness: 82,
    covered: [
      ["Travel Insurance", "Valid", "ok"],
      ["Passports", "All valid", "ok"],
      ["Holiday Bookings", "No upcoming", "neutral"],
      ["Travel Documents", "Good", "ok"],
    ],
    shelves: ["Holidays", "Travel Insurance", "Passports", "Booking Confirmations"],
  },
  bedroom: {
    eyebrow: "Personal Suite",
    subtitle: "Identity, medical records and qualifications",
    scene: "bedroom",
    readiness: 80,
    covered: [
      ["Identity Documents", "Complete", "ok"],
      ["Medical Records", "Review", "warn"],
      ["Qualifications", "Good", "ok"],
      ["Personal Info", "Complete", "ok"],
    ],
    shelves: ["Personal Records", "Identity Documents", "Medical Records", "Qualifications"],
  },
  attic: {
    eyebrow: "Memories Archive",
    subtitle: "Historical documents, archived records and old photos",
    scene: "attic",
    readiness: 60,
    covered: [
      ["Memories", "120 items", "neutral"],
      ["Historical Docs", "Review", "warn"],
      ["Archived Records", "Organised", "ok"],
      ["Old Photos", "200+ items", "neutral"],
    ],
    shelves: ["Memories Archive", "Historical Documents", "Archived Records"],
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
    () => Math.min(99, design.readiness + Math.min(documents.length, 3) * 2),
    [design.readiness, documents.length],
  );

  const openReminders = reminders.filter((reminder) => !reminder.completed);

  return (
    <PageShell>
      <RoomHero
        title={room.title}
        subtitle={design.subtitle}
        eyebrow={design.eyebrow}
        scene={design.scene as HeroScene}
      />

      <div className="relative z-20 mx-auto -mt-14 max-w-md px-4">
        <ReadinessCard score={readinessScore} />
        <div className="mt-4 space-y-4">
          <CoverageList items={design.covered} />
          <DocumentShelf shelves={design.shelves} documents={documents} fallbackItems={room.documents} />
          {openReminders.length || room.reminders.length ? (
            <RemindersCard reminders={openReminders} fallbackItems={room.reminders} />
          ) : null}
        </div>
      </div>

      <FloatingAddButton label={`Add to ${room.title}`} />
      <EstateBottomNav />
    </PageShell>
  );
}

function RemindersCard({
  reminders,
  fallbackItems,
}: {
  reminders: StoredReminder[];
  fallbackItems: readonly string[];
}) {
  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-5 w-5 text-amber-600" />
        <h2 className="text-base font-bold">Reminders</h2>
      </div>
      <div className="space-y-2">
        {reminders.length
          ? reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex min-h-12 items-center justify-between rounded-2xl bg-[#fbf7ef] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{reminder.title}</p>
                  <p className="text-sm text-stone-500">{formatDate(reminder.dueDate)}</p>
                </div>
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
            ))
          : fallbackItems.map((reminder) => (
              <div
                key={reminder}
                className="flex min-h-12 items-center justify-between rounded-2xl bg-[#fbf7ef] px-3 py-2 text-sm font-semibold"
              >
                <span>{reminder}</span>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            ))}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}
