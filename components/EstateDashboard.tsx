 "use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { EstateHotspot } from "@/components/EstateHotspot";
import { hotspots } from "@/lib/mock-data";
import { getDocuments } from "@/lib/supabase/documents";
import { getReminders } from "@/lib/supabase/reminders";

type EstateDashboardProps = {
  panel?: string;
};

export function EstateDashboard({ panel }: EstateDashboardProps) {
  const [badgeState, setBadgeState] = useState<{
    newDocuments: number;
    overdueByRoom: Record<string, number>;
    dueSoonRooms: Set<string>;
  }>({
    newDocuments: 0,
    overdueByRoom: {},
    dueSoonRooms: new Set(),
  });

  useEffect(() => {
    async function refresh() {
      const today = startOfDay(new Date());
      const soon = new Date(today);
      soon.setDate(soon.getDate() + 30);

      const documents = await getDocuments();
      const reminders = (await getReminders()).filter((reminder) => !reminder.completed);
      const overdueByRoom: Record<string, number> = {};
      const dueSoonRooms = new Set<string>();

      reminders.forEach((reminder) => {
        if (!reminder.dueDate) {
          return;
        }

        const dueDate = startOfDay(new Date(`${reminder.dueDate}T00:00:00`));
        if (dueDate < today) {
          overdueByRoom[reminder.roomId] = (overdueByRoom[reminder.roomId] ?? 0) + 1;
        } else if (dueDate <= soon) {
          dueSoonRooms.add(reminder.roomId);
        }
      });

      setBadgeState({
        newDocuments: documents.filter((document) => document.status === "new").length,
        overdueByRoom,
        dueSoonRooms,
      });
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, []);

  const dynamicHotspots = useMemo(
    () =>
      hotspots.map((hotspot) => {
        if (hotspot.id === "mailbox") {
          return {
            ...hotspot,
            count: badgeState.newDocuments || undefined,
            status: badgeState.newDocuments ? ("attention" as const) : hotspot.status,
          };
        }

        const overdueCount = badgeState.overdueByRoom[hotspot.id];
        if (overdueCount) {
          return { ...hotspot, count: overdueCount, status: "attention" as const };
        }

        if (badgeState.dueSoonRooms.has(hotspot.id)) {
          return { ...hotspot, count: undefined, status: "due-soon" as const };
        }

        return { ...hotspot, count: undefined, status: hotspot.status };
      }),
    [badgeState],
  );

  return (
    <main className="relative min-h-svh overflow-hidden bg-black">
      <Image
        src="/images/estate-map-light.png"
        alt="Simply Logged home"
        fill
        unoptimized
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center center" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/18" />
      <AppHeader />
      <section className="absolute inset-0 z-10">
        {dynamicHotspots.map((hotspot) => (
          <EstateHotspot key={hotspot.id} {...hotspot} />
        ))}
      </section>
      {panel === "mailbox" ? (
        <aside className="glass absolute bottom-[calc(6.15rem+env(safe-area-inset-bottom))] left-4 right-4 z-30 mx-auto max-w-md rounded-[1.75rem] p-4 text-zinc-950">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
            Mailbox
          </p>
          <h2 className="mt-1 text-lg font-bold">{badgeState.newDocuments} items need a glance</h2>
          <p className="mt-1 text-sm text-zinc-700">
            New uploads are waiting in the mailbox before they are filed into estate rooms.
          </p>
        </aside>
      ) : null}
      <BottomNav />
    </main>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
