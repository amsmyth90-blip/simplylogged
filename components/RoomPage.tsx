"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BriefcaseBusiness,
  Car,
  DoorOpen,
  Flower2,
  KeyRound,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { RoomLayout } from "@/components/RoomLayout";
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

type RoomConfig = {
  icon: LucideIcon;
  readiness: number;
  coverage: {
    label: string;
    status: string;
    tone: "ok" | "warn" | "neutral";
  }[];
};

const roomConfigs: Record<string, RoomConfig> = {
  bedroom: {
    icon: KeyRound,
    readiness: 80,
    coverage: [
      { label: "Identity", status: "Complete", tone: "ok" },
      { label: "Medical", status: "Review", tone: "warn" },
      { label: "Qualifications", status: "Good", tone: "ok" },
    ],
  },
  office: {
    icon: BriefcaseBusiness,
    readiness: 78,
    coverage: [
      { label: "Mortgage", status: "On track", tone: "ok" },
      { label: "Pension", status: "Review", tone: "warn" },
      { label: "Finance", status: "Good", tone: "ok" },
    ],
  },
  "family-room": {
    icon: Users,
    readiness: 88,
    coverage: [
      { label: "Family records", status: "Good", tone: "ok" },
      { label: "Home cover", status: "Valid", tone: "ok" },
      { label: "Warranties", status: "Soon", tone: "warn" },
    ],
  },
  "safe-room": {
    icon: ShieldCheck,
    readiness: 90,
    coverage: [
      { label: "Will", status: "On file", tone: "ok" },
      { label: "Life cover", status: "Active", tone: "ok" },
      { label: "Power of attorney", status: "Review", tone: "warn" },
    ],
  },
  garage: {
    icon: Car,
    readiness: 92,
    coverage: [
      { label: "MOT", status: "Valid", tone: "ok" },
      { label: "Insurance", status: "Valid", tone: "ok" },
      { label: "Service history", status: "Soon", tone: "warn" },
    ],
  },
  garden: {
    icon: Flower2,
    readiness: 75,
    coverage: [
      { label: "Pets", status: "Good", tone: "ok" },
      { label: "Outdoor kit", status: "Service", tone: "warn" },
      { label: "Garden records", status: "Good", tone: "ok" },
    ],
  },
  driveway: {
    icon: DoorOpen,
    readiness: 82,
    coverage: [
      { label: "Travel insurance", status: "Valid", tone: "ok" },
      { label: "Passports", status: "Valid", tone: "ok" },
      { label: "Bookings", status: "None", tone: "neutral" },
    ],
  },
  attic: {
    icon: Archive,
    readiness: 60,
    coverage: [
      { label: "Memories", status: "Stored", tone: "neutral" },
      { label: "Historical docs", status: "Review", tone: "warn" },
      { label: "Archive", status: "Good", tone: "ok" },
    ],
  },
};

export function RoomPage({ roomId, room }: RoomPageProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [reminders, setReminders] = useState<StoredReminder[]>([]);
  const config = roomConfigs[roomId] ?? roomConfigs.attic;

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

  const openReminderCount = reminders.filter((reminder) => !reminder.completed).length;
  const readiness = useMemo(
    () => Math.min(99, config.readiness + Math.min(documents.length, 3) * 2),
    [config.readiness, documents.length],
  );

  const summaries = [
    {
      label: "Filed documents",
      value: String(documents.length || room.documents.length),
      tone: "green" as const,
    },
    {
      label: "Open reminders",
      value: String(openReminderCount || room.reminders.length),
      tone: openReminderCount ? ("amber" as const) : ("stone" as const),
    },
    {
      label: "Room readiness",
      value: `${readiness}%`,
      tone: "green" as const,
    },
    {
      label: "Quick actions",
      value: "3",
      tone: "stone" as const,
    },
  ];

  return (
    <RoomLayout
      roomId={roomId}
      room={room}
      icon={config.icon}
      readiness={readiness}
      summaries={summaries}
      coverage={config.coverage}
      documents={documents}
      reminders={reminders}
    />
  );
}
