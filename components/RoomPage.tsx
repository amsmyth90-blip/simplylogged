"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DocumentCard } from "@/components/DocumentCard";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { PageHeader } from "@/components/PageHeader";
import { ReminderCard } from "@/components/ReminderCard";
import {
  roomImageLabelClass,
} from "@/components/RoomSceneChrome";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusChip } from "@/components/StatusChip";
import { TaskChecklist } from "@/components/TaskChecklist";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { type AreaStatus, type RoomDetail, type RoomDocument } from "@/lib/mock-data";

const heroAccent: Record<AreaStatus, string> = {
  ready: "linear-gradient(180deg, rgba(94,124,103,0.12) 0%, rgba(56,48,35,0.18) 45%, rgba(39,32,24,0.48) 100%)",
  attention: "linear-gradient(180deg, rgba(214,141,90,0.12) 0%, rgba(56,48,35,0.2) 45%, rgba(39,32,24,0.5) 100%)",
  secure: "linear-gradient(180deg, rgba(99,136,150,0.12) 0%, rgba(56,48,35,0.18) 45%, rgba(39,32,24,0.48) 100%)"
};

const roomHeroImages: Record<string, string> = {
  attic: "/images/pages/attic-hero.webp",
  bedroom: "/images/pages/bedroom-hero.webp",
  office: "/images/pages/office-hero.webp",
  "family-room": "/images/pages/family-room-hero.webp",
  "safe-room": "/images/pages/safe-room-hero.webp",
  garage: "/images/pages/garage-hero.webp",
  mailbox: "/images/pages/mailbox-hero.webp",
  garden: "/images/pages/garden-hero.webp",
  driveway: "/images/pages/driveway-hero.webp"
};

const swipeRoomOrder = ["attic", "bedroom", "office", "family-room", "safe-room", "garage", "garden", "driveway"] as const;

const roomHeroPositions: Record<string, string> = {
  attic: "center 45%",
  bedroom: "center 50%",
  office: "center 48%",
  "family-room": "center 48%",
  "safe-room": "center 48%",
  garage: "center 48%",
  mailbox: "center 46%",
  garden: "center 43%",
  driveway: "center 46%"
};

const roomDocumentCategories: Record<string, string> = {
  office: "Legal & Estate",
  bedroom: "Health & Medical",
  attic: "Memories",
  garage: "Vehicles & Transport",
  garden: "Pets & Outdoor",
  driveway: "Travel & Access",
  "safe-room": "Legal & Estate",
  "family-room": "Memories"
};

type RoomPageProps = {
  room: RoomDetail;
};

type RoomModal = "task" | "document" | "activity" | null;

const routeTone = {
  new: "bg-white/80 text-ink/55",
  vault: "bg-mist text-sky-700",
  reminder: "bg-blush text-orange-700",
  room: "bg-sage/70 text-moss",
  ignored: "bg-stone-100 text-stone-500"
} as const;

const routeLabel = {
  new: "Needs routing",
  vault: "Filed to Vault",
  reminder: "Reminder created",
  room: "Sent to room",
  ignored: "Ignored"
} as const;

const starterSuggestions: Record<string, string[]> = {
  attic: ["Scan old family letters", "Add photo album notes", "Store keepsake details"],
  bedroom: ["Add GP details", "Scan prescription list", "Store health insurance"],
  office: ["Scan passport or ID", "Add house deeds", "Store will or POA"],
  "family-room": ["Invite a household member", "Review shared access", "Check the Family Inbox"],
  "safe-room": ["Add emergency instructions", "Mark insurance claim pack", "Store key holder notes"],
  garage: ["Scan MOT certificate", "Add car insurance", "Store service history"],
  mailbox: ["Scan new post", "Route incoming bill", "Create follow-up reminder"],
  garden: ["Scan pet vaccination card", "Add gardener details", "Store outdoor plan"],
  driveway: ["Add travel checklist", "Store parking notes", "Scan passport renewal notice"]
};

type RoomObject = {
  label: string;
  detail: string;
  href: string;
  icon: IconName;
  left: string;
  top: string;
};

const interactiveRoomObjects: Record<string, RoomObject[]> = {
  attic: [
    { label: "Photo albums", detail: "Open family memories", href: "/files", icon: "archive", left: "30%", top: "44%" },
    { label: "Keepsake chest", detail: "View legacy records", href: "/files", icon: "lock", left: "72%", top: "55%" }
  ],
  bedroom: [
    { label: "Health & Medical", detail: "Open health records", href: "/room/bedroom#room-documents", icon: "folder", left: "28%", top: "49%" },
    { label: "Appointments", detail: "View upcoming care", href: "/reminders", icon: "calendar", left: "70%", top: "38%" }
  ],
  office: [
    { label: "Document drawer", detail: "Open important files", href: "/files", icon: "folder", left: "28%", top: "52%" },
    { label: "Family access", detail: "Manage trusted people", href: "/family", icon: "users", left: "72%", top: "42%" }
  ],
  "family-room": [
    { label: "Household members", detail: "Manage people and access", href: "/family", icon: "users", left: "32%", top: "40%" },
    { label: "Family Inbox", detail: "Review shared action items", href: "/family", icon: "mail", left: "72%", top: "52%" }
  ],
  "safe-room": [
    { label: "Emergency plan", detail: "Open emergency access", href: "/emergency", icon: "shield", left: "34%", top: "45%" },
    { label: "Secure files", detail: "View protected documents", href: "/files", icon: "lock", left: "70%", top: "54%" }
  ],
  garage: [
    { label: "Vehicle documents", detail: "Open MOT and insurance", href: "/room/garage#room-documents", icon: "car", left: "32%", top: "52%" },
    { label: "Service calendar", detail: "View vehicle reminders", href: "/reminders", icon: "calendar", left: "72%", top: "39%" }
  ],
  garden: [
    { label: "Pet records", detail: "Open pet information", href: "/room/garden#room-documents", icon: "leaf", left: "31%", top: "52%" },
    { label: "Garden jobs", detail: "View outdoor reminders", href: "/reminders", icon: "calendar", left: "72%", top: "43%" }
  ],
  driveway: [
    { label: "Travel documents", detail: "Open travel records", href: "/room/driveway#room-documents", icon: "map-pin", left: "32%", top: "48%" },
    { label: "Trip planner", detail: "View upcoming travel", href: "/reminders", icon: "calendar", left: "72%", top: "42%" }
  ]
};
export function RoomPage({ room }: RoomPageProps) {
  const router = useRouter();
  const swipeStartX = useRef<number | null>(null);
  const { state, updateState } = useDiaryDockData();
  const tasks = state.roomTasks[room.id] ?? room.tasks;
  const documents = state.roomDocuments[room.id] ?? room.documents;
  const activity = state.roomActivity[room.id] ?? room.activity;
  const roomReminders = useMemo(
    () => state.reminders.filter((item) => item.roomId === room.id).slice(0, 3),
    [room.id, state.reminders]
  );
  const roomVaultDocuments = useMemo(
    () =>
      state.vaultDocuments.filter(
        (document) => document.roomId === room.id || document.roomName === room.name
      ),
    [room.id, room.name, state.vaultDocuments]
  );
  const documentEntries = useMemo(() => {
    const vaultByTitle = new Map(
      roomVaultDocuments.map((document) => [document.title.trim().toLowerCase(), document])
    );
    const listedTitles = new Set(documents.map((document) => document.title.trim().toLowerCase()));
    const linkedRoomDocuments = documents.map((document) => {
      const vaultDocument = vaultByTitle.get(document.title.trim().toLowerCase());

      return {
        ...document,
        href: vaultDocument ? `/document/${vaultDocument.id}?from=${room.id}` : "/files",
        reviewStatus: vaultDocument?.reviewStatus
      };
    });
    const vaultOnlyDocuments = roomVaultDocuments
      .filter((document) => !listedTitles.has(document.title.trim().toLowerCase()))
      .map((document) => ({
        id: document.id,
        title: document.title,
        kind: document.kind,
        size: document.size,
        updated: document.updated,
        href: `/document/${document.id}?from=${room.id}`,
        reviewStatus: document.reviewStatus
      }));

    return [...linkedRoomDocuments, ...vaultOnlyDocuments];
  }, [documents, room.id, roomVaultDocuments]);
  const mailItems = room.id === "mailbox" ? state.mailboxItems : [];
  const [modal, setModal] = useState<RoomModal>(null);
  const [taskDraft, setTaskDraft] = useState({ label: "", due: "" });
  const [documentDraft, setDocumentDraft] = useState({
    title: "",
    kind: "PDF" as RoomDocument["kind"],
    size: ""
  });
  const [activityDraft, setActivityDraft] = useState({ text: "", by: "You" });

  const closeModal = () => {
    setModal(null);
    setTaskDraft({ label: "", due: "" });
    setDocumentDraft({ title: "", kind: "PDF", size: "" });
    setActivityDraft({ text: "", by: "You" });
  };

  const addActivityEntry = (text: string, by = "DiaryDock") => {
    updateState((current) => ({
      ...current,
      roomActivity: {
        ...current.roomActivity,
        [room.id]: [
          {
            id: `${room.id}-activity-${Date.now()}`,
            text,
            when: "Just now",
            by
          },
          ...(current.roomActivity[room.id] ?? [])
        ]
      }
    }));
  };

  const toggleTask = (id: string) => {
    updateState((current) => ({
      ...current,
      roomTasks: {
        ...current.roomTasks,
        [room.id]: (current.roomTasks[room.id] ?? []).map((task) =>
          task.id === id ? { ...task, done: !task.done } : task
        )
      }
    }));
  };

  const addTask = () => {
    const label = taskDraft.label.trim();
    if (!label) {
      return;
    }

    updateState((current) => ({
      ...current,
      roomTasks: {
        ...current.roomTasks,
        [room.id]: [
          {
            id: `${room.id}-task-${Date.now()}`,
            label,
            due: taskDraft.due.trim() || undefined,
            done: false
          },
          ...(current.roomTasks[room.id] ?? [])
        ]
      }
    }));
    addActivityEntry(`Added a new room task: ${label}`);
    closeModal();
  };

  const addDocument = () => {
    const title = documentDraft.title.trim();
    if (!title) {
      return;
    }

    const nextRoomDocument: RoomDocument = {
      id: `${room.id}-document-${Date.now()}`,
      title,
      kind: documentDraft.kind,
      size: documentDraft.size.trim() || "Pending upload",
      updated: "Just now"
    };

    updateState((current) => ({
      ...current,
      roomDocuments: {
        ...current.roomDocuments,
        [room.id]: [nextRoomDocument, ...(current.roomDocuments[room.id] ?? [])]
      },
      vaultDocuments: [
        {
          id: `vault-${nextRoomDocument.id}`,
          title: nextRoomDocument.title,
          category: roomDocumentCategories[room.id] ?? "Home & Property",
          kind: nextRoomDocument.kind,
          size: nextRoomDocument.size,
          updated: "Just now",
          roomId: room.id,
          roomName: room.name,
          reviewStatus: "needs-review",
          reviewReasons: ["Please check the document title, category and room before relying on these details."]
        },
        ...current.vaultDocuments
      ]
    }));
    addActivityEntry(`Filed ${title} in this room`);
    closeModal();
  };

  const addActivity = () => {
    const text = activityDraft.text.trim();
    if (!text) {
      return;
    }

    addActivityEntry(text, activityDraft.by.trim() || "You");
    closeModal();
  };

  const routeMailboxItem = (id: string, target: "vault" | "reminder" | "room") => {
    const item = state.mailboxItems.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    updateState((current) => {
      const nextState = {
        ...current,
        mailboxItems: current.mailboxItems.map((entry) =>
          entry.id === id ? { ...entry, routeStatus: target } : entry
        )
      };

      if (target === "vault") {
        nextState.vaultDocuments = [
          {
            id: `vault-mail-${item.id}`,
            title: item.title,
            category: item.suggestedRoom === "Family Room" ? "Memories" : "Home & Property",
            kind: item.kind === "Form" ? "PDF" : "Scan",
            size: "Pending review",
            updated: "Just now"
          },
          ...nextState.vaultDocuments
        ];
      }

      if (target === "reminder") {
        nextState.reminders = [
          {
            id: `mail-reminder-${item.id}`,
            title: `Review ${item.title}`,
            note: `${item.source} arrived in the Mailbox and needs a decision.`,
            roomId: "mailbox",
            roomName: "Mailbox",
            group: "today",
            timeLabel: "Today",
            priority: "high"
          },
          ...nextState.reminders
        ];
      }

      return nextState;
    });

    const routeText =
      target === "vault"
        ? `${item.title} was sent to All Files`
        : target === "reminder"
          ? `${item.title} was turned into a reminder`
          : `${item.title} was routed to ${item.suggestedRoom ?? "its room"}`;

    addActivityEntry(routeText);
  };

  const openTaskCount = tasks.filter((task) => !task.done).length;
  const routedCount = mailItems.filter((item) => item.routeStatus !== "new").length;
  const roomScanHref = `/capture?room=${encodeURIComponent(room.id)}`;
  const roomStarterSuggestions = starterSuggestions[room.id] ?? room.belongsHere.slice(0, 3).map((item) => `Add ${item.toLowerCase()}`);

  const moveToAdjacentRoom = (direction: 1 | -1) => {
    const currentIndex = swipeRoomOrder.indexOf(room.id as (typeof swipeRoomOrder)[number]);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + direction + swipeRoomOrder.length) % swipeRoomOrder.length;
    router.push(`/room/${swipeRoomOrder[nextIndex]}`);
  };

  return (
    <>
      <div
        className="immersive-page touch-pan-y"
        onTouchStart={(event) => {
          swipeStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (swipeStartX.current === null) return;
          const deltaX = event.changedTouches[0]?.clientX - swipeStartX.current;
          swipeStartX.current = null;
          if (Math.abs(deltaX) < 85) return;
          moveToAdjacentRoom(deltaX < 0 ? 1 : -1);
        }}
      >
        <PageHeader
          eyebrow={room.domain}
          title={room.name}
          subtitle={room.headline}
          backHref="/dashboard"
          backLabel="Estate map"
          heroImage={roomHeroImages[room.id] ?? "/images/estate-map-light.png"}
          heroPosition={roomHeroPositions[room.id] ?? "center 45%"}
          heroTone={heroAccent[room.status]}
          heroOverlay={
            <>
              {(interactiveRoomObjects[room.id] ?? []).map((object) => (
                <Link
                  key={object.label}
                  href={object.href}
                  className={`group pointer-events-auto absolute flex min-h-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${roomImageLabelClass}`}
                  style={{ left: object.left, top: object.top, transform: "translate(-50%, -50%)" }}
                  aria-label={`${object.label}: ${object.detail}`}
                >
                  {object.label}
                </Link>
              ))}
            </>
          }
          badge="Room"
          action={
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/14 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-md">
              <UiIcon name={room.icon as IconName} className="h-5 w-5" />
            </span>
          }
          meta={
            <>
              <StatusChip status={room.status} />
              <span className="estate-chip border-white/30 bg-white/14 text-white/80">{room.stats.records} records</span>
              <span className="estate-chip border-white/30 bg-white/14 text-white/80">{documents.length} documents</span>
              <span className="estate-chip border-white/30 bg-white/14 text-white/80">
                Updated {room.stats.updated.toLowerCase()}
              </span>
            </>
          }
        />

        <section className="relative z-20 estate-sheet p-5 sm:-mt-20 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="max-w-2xl text-sm leading-6 text-ink/62">{room.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Open tasks", value: openTaskCount },
                  { label: "Documents", value: documents.length },
                  { label: "Recent activity", value: activity.length },
                  {
                    label: room.id === "mailbox" ? "Routed items" : "Linked reminders",
                    value: room.id === "mailbox" ? routedCount : roomReminders.length
                  }
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-[24px] border border-white/70 bg-white/54 px-4 py-4 shadow-[0_20px_40px_-32px_rgba(54,44,24,0.22)]"
                  >
                    <p className="text-[28px] font-semibold tracking-tight text-ink">{item.value}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/42">{item.label}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/52 p-4 shadow-[0_20px_40px_-32px_rgba(54,44,24,0.22)]">
              <SectionHeader title="What belongs here" hint="The kinds of things this room holds" />
              <div className="mt-3 flex flex-wrap gap-2">
                {room.belongsHere.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/80 bg-white/70 px-3.5 py-2 text-[13px] font-medium text-ink/72"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <Link
                href={roomScanHref}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
              >
                <UiIcon name="plus" className="h-4 w-4" />
                Scan into {room.name}
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Start with these" hint={`Good first records for ${room.name}`} />
          <div className="grid gap-3 sm:grid-cols-3">
            {roomStarterSuggestions.map((suggestion, index) => (
              <Link
                key={suggestion}
                href={roomScanHref}
                className="estate-sheet group flex items-start gap-3 p-4 transition hover:-translate-y-0.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage/55 text-moss">
                  <span className="text-xs font-bold">{index + 1}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{suggestion}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink/48">
                    Tap to scan and file this directly toward {room.name}.
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <SectionHeader title="To do in this room" hint="Tap to mark complete" />
            <button
              type="button"
              onClick={() => setModal("task")}
              className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
            >
              Add task
            </button>
          </div>
          <div className="estate-sheet p-4">
            <TaskChecklist tasks={tasks} onToggle={toggleTask} />
          </div>
        </section>

        <section id="room-documents" className="scroll-mt-24 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <SectionHeader
              title={
                room.id === "bedroom"
                  ? "Health & Medical"
                  : room.id === "garage"
                    ? "Vehicle documents"
                    : room.id === "garden"
                      ? "Pet records"
                      : room.id === "driveway"
                        ? "Travel documents"
                        : "Documents"
              }
              hint="Stored securely in All Files and linked to this room"
              actionLabel="Open All Files"
              actionHref="/files"
            />
            <button
              type="button"
              onClick={() => setModal("document")}
              className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
            >
              Add document
            </button>
          </div>
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {documentEntries.map((doc) => (
              <DocumentCard
                key={doc.id}
                title={doc.title}
                kind={doc.kind}
                meta={`${doc.size} - Updated ${doc.updated.toLowerCase()}`}
                href={doc.href}
                badge={doc.reviewStatus === "needs-review" ? "Please check" : undefined}
              />
            ))}
          </div>
        </section>

        {room.id === "mailbox" ? (
          <section className="space-y-3">
            <SectionHeader title="Mailbox intake queue" hint="Route new arrivals into the estate" />
            <div className="space-y-3">
              {mailItems.map((item) => (
                <article key={item.id} className="estate-sheet p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-ink/50">
                        {item.source} - {item.kind}
                        {item.suggestedRoom ? ` - Suggested room: ${item.suggestedRoom}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${routeTone[item.routeStatus]}`}>
                      {routeLabel[item.routeStatus]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => routeMailboxItem(item.id, "vault")}
                      className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-ink/65 transition hover:bg-white"
                    >
                      File to All Files
                    </button>
                    <button
                      type="button"
                      onClick={() => routeMailboxItem(item.id, "reminder")}
                      className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-ink/65 transition hover:bg-white"
                    >
                      Create reminder
                    </button>
                    <button
                      type="button"
                      onClick={() => routeMailboxItem(item.id, "room")}
                      className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-ink/65 transition hover:bg-white"
                    >
                      Send to room
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {roomReminders.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader title="Linked reminders" hint="Jobs connected to this room" actionLabel="Open reminders" actionHref="/reminders" />
            <div className="space-y-3">
              {roomReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} href="/reminders" showRoom={false} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <SectionHeader title="Recent activity" />
            <button
              type="button"
              onClick={() => setModal("activity")}
              className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
            >
              Log update
            </button>
          </div>
          <div className="estate-sheet p-5">
            <ol className="space-y-4">
              {activity.map((entry, index) => (
                <li key={entry.id} className="relative flex gap-3.5">
                  <span className="flex flex-col items-center">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss" />
                    {index < activity.length - 1 ? <span className="mt-1 w-px flex-1 bg-ink/10" /> : null}
                  </span>
                  <span className="min-w-0 pb-1">
                    <span className="block text-sm font-medium text-ink">{entry.text}</span>
                    <span className="mt-0.5 block text-xs text-ink/50">
                      {entry.when} - {entry.by}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Quick actions" />
          <div className="grid grid-cols-3 gap-3">
            {room.quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="estate-sheet flex flex-col items-center gap-2 px-3 py-4 text-center transition hover:-translate-y-0.5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#6c5735,#4d3d24)] text-white shadow-[0_18px_30px_-22px_rgba(54,44,24,0.45)]">
                  <UiIcon name={action.icon as IconName} className="h-[18px] w-[18px]" />
                </span>
                <span className="text-xs font-semibold leading-tight text-ink/75">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <ModalShell
        open={modal !== null}
        title={
          modal === "task"
            ? `Add a task to ${room.name}`
            : modal === "document"
              ? `Add a document to ${room.name}`
              : `Log an update in ${room.name}`
        }
        subtitle="Shared with the rest of DiaryDock through the app data layer."
        onClose={closeModal}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-white hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={modal === "task" ? addTask : modal === "document" ? addDocument : addActivity}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-ink/90"
            >
              Save
            </button>
          </div>
        }
      >
        {modal === "task" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Task</span>
              <input
                type="text"
                value={taskDraft.label}
                onChange={(event) => setTaskDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="Review insurance renewal"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Due</span>
              <input
                type="text"
                value={taskDraft.due}
                onChange={(event) => setTaskDraft((current) => ({ ...current, due: event.target.value }))}
                placeholder="This week"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        ) : null}

        {modal === "document" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Title</span>
              <input
                type="text"
                value={documentDraft.title}
                onChange={(event) => setDocumentDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="New household record"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Type</span>
                <select
                  value={documentDraft.kind}
                  onChange={(event) =>
                    setDocumentDraft((current) => ({
                      ...current,
                      kind: event.target.value as RoomDocument["kind"]
                    }))
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                >
                  <option value="PDF">PDF</option>
                  <option value="Scan">Scan</option>
                  <option value="Note">Note</option>
                  <option value="Image">Image</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Size</span>
                <input
                  type="text"
                  value={documentDraft.size}
                  onChange={(event) => setDocumentDraft((current) => ({ ...current, size: event.target.value }))}
                  placeholder="420 KB"
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
                />
              </label>
            </div>
          </div>
        ) : null}

        {modal === "activity" ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Update</span>
              <textarea
                value={activityDraft.text}
                onChange={(event) => setActivityDraft((current) => ({ ...current, text: event.target.value }))}
                rows={3}
                placeholder="Added a note about the latest change."
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">By</span>
              <input
                type="text"
                value={activityDraft.by}
                onChange={(event) => setActivityDraft((current) => ({ ...current, by: event.target.value }))}
                placeholder="You"
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss"
              />
            </label>
          </div>
        ) : null}
      </ModalShell>
    </>
  );
}
