"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { GardenSection, GardenSectionId } from "@/lib/garden-sections";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

type SectionMeta = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  emptyTitle: string;
  emptyDetail: string;
  documentTerms: string[];
  reminderTerms: string[];
  guidance: string[];
  notice?: string;
  accent: "sage" | "moss" | "clay" | "gold";
};

type ReminderDraft = {
  title: string;
  date: string;
  time: string;
  note: string;
  repeat: string;
  priority: Reminder["priority"];
};

const emptyReminderDraft: ReminderDraft = {
  title: "",
  date: "",
  time: "",
  note: "",
  repeat: "",
  priority: "normal",
};

const sectionMeta: Record<GardenSectionId, SectionMeta> = {
  pets: {
    eyebrow: "Pets & care",
    title: "Pet profiles and care records",
    description:
      "Keep pet routines, vet details, vaccination records and care notes together without mixing them into Family or Health.",
    primaryAction: "Add pet reminder",
    emptyTitle: "No pet care items yet",
    emptyDetail:
      "Add vaccination dates, flea treatment reminders, pet-sitter notes or upload a pet document when you are ready.",
    documentTerms: ["pet", "vet", "veterinary", "vaccination", "microchip"],
    reminderTerms: ["pet", "vet", "vaccination", "flea", "worm"],
    guidance: ["Pet profiles", "Vet records", "Vaccination dates", "Care routines"],
    notice:
      "DiaryDock helps organise pet information you provide. It does not diagnose, prescribe or replace advice from a qualified veterinary professional.",
    accent: "sage",
  },
  "outdoor-spaces": {
    eyebrow: "Outdoor spaces",
    title: "Outdoor spaces, boundaries and safety",
    description:
      "Organise gardens, patios, fences, gates and outdoor safety notes without pulling in vehicle or travel records.",
    primaryAction: "Add outdoor reminder",
    emptyTitle: "No outdoor space records yet",
    emptyDetail:
      "Use this for patio notes, boundary repairs, gate checks, outdoor lighting or garden condition photos.",
    documentTerms: ["garden", "patio", "balcony", "outdoor", "deck", "lawn", "planting", "boundary", "fence", "gate", "wall", "safety", "outdoor light", "neighbour"],
    reminderTerms: ["garden", "patio", "balcony", "outdoor", "lawn", "planting", "boundary", "fence", "gate", "wall", "safety", "outdoor light"],
    guidance: ["Outdoor areas", "Fences & gates", "Condition photos", "Safety notes"],
    notice:
      "DiaryDock stores your notes and documents but does not determine legal boundary ownership, certify safety or replace advice from a qualified professional.",
    accent: "moss",
  },
  jobs: {
    eyebrow: "Jobs & maintenance",
    title: "Garden jobs and outdoor projects",
    description:
      "Track recurring jobs, one-off outdoor repairs, seasonal maintenance and projects using DiaryDock's existing reminder system.",
    primaryAction: "Add garden job",
    emptyTitle: "No garden jobs yet",
    emptyDetail:
      "Add a job such as hedge trimming, pressure washing, lawn care, landscaping quotes or seasonal checks.",
    documentTerms: ["garden", "outdoor", "maintenance", "repair", "hedge", "lawn", "sprinkler", "garden project", "landscaping", "quote", "outdoor project", "planting plan"],
    reminderTerms: ["garden", "outdoor", "maintenance", "repair", "hedge", "lawn", "sprinkler", "garden project", "landscaping", "quote", "outdoor project", "planting plan"],
    guidance: ["One-off jobs", "Recurring jobs", "Projects", "History"],
    accent: "gold",
  },
  "tools-shed": {
    eyebrow: "Tools & shed",
    title: "Tools, equipment and outdoor storage",
    description:
      "Store shed notes, greenhouse checks, tool manuals, servicing reminders and warranty files without duplicating appliance records from the Kitchen.",
    primaryAction: "Add tools or shed reminder",
    emptyTitle: "No tools or shed records yet",
    emptyDetail:
      "Add shed repairs, greenhouse checks, lawnmower servicing, pressure washer manuals or battery checks.",
    documentTerms: ["shed", "greenhouse", "outbuilding", "garden office", "summer house", "tool", "equipment", "lawnmower", "mower", "pressure washer", "strimmer", "warranty", "manual"],
    reminderTerms: ["shed", "greenhouse", "outbuilding", "garden office", "summer house", "tool", "equipment", "lawnmower", "mower", "pressure washer", "strimmer", "battery"],
    guidance: ["Sheds", "Tools", "Servicing", "Manuals"],
    accent: "sage",
  },
  bins: {
    eyebrow: "Bins & collections",
    title: "Waste and recycling collections",
    description:
      "Keep bin-day reminders and collection changes visible here, without turning the Kitchen noticeboard into a catch-all.",
    primaryAction: "Add collection reminder",
    emptyTitle: "No collection schedule yet",
    emptyDetail:
      "Add recycling, food waste, garden waste or bulky collection reminders.",
    documentTerms: ["bin", "bins", "recycling", "waste", "collection", "council"],
    reminderTerms: ["bin", "bins", "recycling", "waste", "collection", "garden waste"],
    guidance: ["Schedules", "Waste types", "Changes", "Reminders"],
    accent: "moss",
  },
};

const accentClasses: Record<SectionMeta["accent"], { hero: string; tint: string; icon: string }> = {
  sage: {
    hero: "bg-[linear-gradient(135deg,#315443,#5f7f63)]",
    tint: "bg-[#eef4eb]",
    icon: "bg-[#e3ecdf] text-[#52705a]",
  },
  moss: {
    hero: "bg-[linear-gradient(135deg,#25392e,#6f8e72)]",
    tint: "bg-[#edf2e8]",
    icon: "bg-[#dde8d7] text-[#48654f]",
  },
  clay: {
    hero: "bg-[linear-gradient(135deg,#315443,#a98b67)]",
    tint: "bg-[#f4eee4]",
    icon: "bg-[#eadfcd] text-[#765f43]",
  },
  gold: {
    hero: "bg-[linear-gradient(135deg,#315443,#b89a57)]",
    tint: "bg-[#f7f1df]",
    icon: "bg-[#efe5c7] text-[#7a6336]",
  },
};

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] border border-[#20352a]/[0.07] bg-[#fffdf8]/95 p-4 shadow-[0_20px_48px_-38px_rgba(32,53,42,0.68)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function searchableText(document: VaultDocument) {
  return `${document.title} ${document.category} ${document.kind} ${document.issuer ?? ""}`.toLowerCase();
}

function reminderText(reminder: Reminder) {
  return `${reminder.title} ${reminder.note ?? ""} ${reminder.roomName ?? ""}`.toLowerCase();
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term.toLowerCase()));
}

function sectionDocuments(documents: VaultDocument[], sectionId: GardenSectionId, meta: SectionMeta) {
  return documents.filter((document) => {
    if (document.roomId === "garden") {
      return sectionId === "jobs" || matchesAny(searchableText(document), meta.documentTerms);
    }
    return matchesAny(searchableText(document), meta.documentTerms);
  });
}

function sectionReminders(reminders: Reminder[], sectionId: GardenSectionId, meta: SectionMeta) {
  return reminders.filter((reminder) => {
    if (reminder.group === "done") return false;
    const text = reminderText(reminder);
    if (sectionId === "jobs" && reminder.roomId === "garden") return true;
    return matchesAny(text, meta.reminderTerms);
  });
}

function EmptyPrompt({
  icon,
  title,
  detail,
  action,
}: {
  icon: IconName;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#6f8e72]/25 bg-[#faf9f4] p-5 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#e8eee3] text-[#52705a]">
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <h2 className="mt-3 font-serif text-xl text-[#20352a]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#667068]">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function RowLink({
  href,
  icon,
  title,
  detail,
  tone = "default",
}: {
  href: string;
  icon: IconName;
  title: string;
  detail: string;
  tone?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[70px] items-center gap-3 rounded-[18px] p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] ${
        tone === "primary" ? "bg-[#315443] text-white hover:bg-[#3d624f]" : "bg-[#f7f5ef] text-[#20352a] hover:bg-[#eef2e9]"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${
          tone === "primary" ? "bg-white/14 text-[#e8eee3]" : "bg-white text-[#52705a]"
        }`}
      >
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className={`mt-1 block text-[11px] leading-4 ${tone === "primary" ? "text-white/70" : "text-[#667068]"}`}>
          {detail}
        </span>
      </span>
      <UiIcon name="chevron-right" className={`h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${tone === "primary" ? "text-white/70" : "text-[#8a938b]"}`} />
    </Link>
  );
}

export function GardenSectionWorkspace({ section }: { section: GardenSection }) {
  const { state, hydrated, repositoryMode, updateState } = useDiaryDockData();
  const [addingReminder, setAddingReminder] = useState(false);
  const [draft, setDraft] = useState<ReminderDraft>(emptyReminderDraft);
  const [message, setMessage] = useState("");
  const meta = sectionMeta[section.id];
  const accent = accentClasses[meta.accent];

  const documents = useMemo(
    () => sectionDocuments(state.vaultDocuments, section.id, meta),
    [state.vaultDocuments, section.id, meta],
  );
  const reminders = useMemo(
    () => sectionReminders(state.reminders, section.id, meta),
    [state.reminders, section.id, meta],
  );
  const reviewDocuments = documents.filter((document) => document.reviewStatus === "needs-review");

  async function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setMessage("Add a title before saving the reminder.");
      return;
    }

    const dateLabel = formatDate(draft.date);
    const timeLabel = [dateLabel, draft.time].filter(Boolean).join(", ") || "Later";
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      note: draft.note.trim() || `${section.title} reminder`,
      roomId: "garden",
      roomName: "Garden",
      group: draft.date ? "later" : "week",
      timeLabel,
      priority: draft.priority,
      repeat: draft.repeat.trim() || undefined,
      dueDate: draft.date || undefined,
    };

    updateState((current) => ({ ...current, reminders: [reminder, ...current.reminders] }));

    if (repositoryMode === "supabase") {
      await upsertStructuredReminder(reminder);
    }

    setDraft(emptyReminderDraft);
    setAddingReminder(false);
    setMessage(`${section.title} reminder saved.`);
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#f5f2ea] p-4">
        <div className="mx-auto max-w-[760px] animate-pulse space-y-4">
          <div className="h-40 rounded-[28px] bg-white/70" />
          <div className="h-72 rounded-[24px] bg-white/70" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f2ea] pb-32 text-[#20352a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <span className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-[#dfe7d8]/60 blur-3xl" />
        <span className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-[#ead9c0]/45 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[760px] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className={`overflow-hidden rounded-[30px] ${accent.hero} p-5 text-white shadow-[0_26px_60px_-38px_rgba(32,53,42,0.75)]`}>
          <div className="flex items-start gap-3">
            <Link
              href="/room/garden"
              aria-label="Back to Garden"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <UiIcon name="arrow-left" className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
                Garden · {meta.eyebrow}
              </p>
              <h1 className="mt-1 font-serif text-[32px] leading-tight tracking-tight sm:text-4xl">{section.title}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/78">{meta.description}</p>
            </div>
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-white/12 text-[#edf3e9] sm:flex" aria-hidden="true">
              <UiIcon name={section.icon} className="h-6 w-6" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [reminders.length, "Reminders"],
              [documents.length, "Files"],
              [reviewDocuments.length, "To check"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[18px] border border-white/10 bg-white/12 px-2 py-3 text-center">
                <p className="font-serif text-2xl leading-none">{value}</p>
                <p className="mt-1 text-[10px] font-semibold text-white/68">{label}</p>
              </div>
            ))}
          </div>
        </header>

        {message ? (
          <p role="status" className="mt-4 rounded-2xl bg-[#e8eee3] px-4 py-3 text-xs font-medium text-[#48604e]">
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setAddingReminder(true);
            }}
            className="flex min-h-[76px] items-center gap-3 rounded-[20px] bg-[#315443] p-3 text-left text-white transition hover:bg-[#3d624f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white/14 text-[#e8eee3]">
              <UiIcon name="calendar" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{meta.primaryAction}</span>
              <span className="mt-1 block text-[11px] leading-4 text-white/70">Create a Garden reminder using the existing DiaryDock reminders.</span>
            </span>
            <UiIcon name="plus" className="h-4 w-4 shrink-0 text-white/70" />
          </button>
          <RowLink
            href={`/capture?room=garden&section=${section.id}`}
            icon="camera"
            title="Upload a Garden file"
            detail="Scan or upload a related record into All Files."
          />
        </div>

        <Card className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">What belongs here</p>
              <h2 className="mt-1 font-serif text-2xl">{meta.title}</h2>
            </div>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ${accent.icon}`} aria-hidden="true">
              <UiIcon name={section.icon} className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {meta.guidance.map((item) => (
              <span key={item} className={`rounded-full px-3 py-2 text-[11px] font-semibold text-[#52705a] ${accent.tint}`}>
                {item}
              </span>
            ))}
          </div>
        </Card>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Reminders</p>
                <h2 className="mt-1 font-serif text-2xl">Things to do</h2>
              </div>
              <button
                type="button"
                onClick={() => setAddingReminder(true)}
                className="inline-flex min-h-11 items-center rounded-full px-2 text-xs font-semibold text-[#52705a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
              >
                Add
              </button>
            </div>
            {reminders.length ? (
              <div className="mt-4 space-y-2">
                {reminders.slice(0, 6).map((reminder) => (
                  <Link
                    key={reminder.id}
                    href="/reminders"
                    className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3 transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
                      <UiIcon name="calendar" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{reminder.title}</span>
                      <span className="mt-1 block truncate text-[10px] text-[#667068]">
                        {[reminder.timeLabel, reminder.repeat, reminder.note].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyPrompt
                icon="calendar"
                title={meta.emptyTitle}
                detail={meta.emptyDetail}
                action={
                  <button
                    type="button"
                    onClick={() => setAddingReminder(true)}
                    className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
                  >
                    Add first reminder
                  </button>
                }
              />
            )}
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">Files</p>
                <h2 className="mt-1 font-serif text-2xl">Stored records</h2>
              </div>
              <Link href={`/capture?room=garden&section=${section.id}`} className="inline-flex min-h-11 items-center rounded-full px-2 text-xs font-semibold text-[#52705a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
                Upload
              </Link>
            </div>
            {documents.length ? (
              <div className="mt-4 space-y-2">
                {documents.slice(0, 6).map((document) => (
                  <Link
                    key={document.id}
                    href={`/document/${document.id}?from=garden`}
                    className="flex min-h-16 items-center gap-3 rounded-[18px] bg-[#f7f5ef] p-3 transition hover:bg-[#eef2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
                      <UiIcon name={document.reviewStatus === "needs-review" ? "alert" : "file"} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{document.title}</span>
                      <span className="mt-1 block truncate text-[10px] text-[#667068]">
                        {document.kind} · {document.updated} · {document.reviewStatus === "needs-review" ? "Check details" : "Stored"}
                      </span>
                    </span>
                    <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyPrompt
                icon="folder"
                title="No files linked yet"
                detail="Upload a document, photo or note when you have something real to store. DiaryDock will not create sample records here."
                action={
                  <Link href={`/capture?room=garden&section=${section.id}`} className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white">
                    Upload a file
                  </Link>
                }
              />
            )}
          </Card>
        </section>

        <Card className="mt-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e8eee3] text-[#52705a]" aria-hidden="true">
              <UiIcon name="check" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl">Keeps Garden clear</h2>
              <p className="mt-1 text-xs leading-5 text-[#667068]">
                Formal household paperwork still belongs in Office, vehicles stay in Garage, and family schedules stay in Family Room or Kitchen. This section is just for outdoor-life admin.
              </p>
            </div>
          </div>
        </Card>

        {meta.notice ? (
          <p className="mt-5 rounded-[18px] border border-[#20352a]/[0.07] bg-[#eef2e9]/85 px-4 py-3.5 text-[11px] leading-5 text-[#667068]">
            {meta.notice}
          </p>
        ) : null}
      </div>

      <ModalShell
        open={addingReminder}
        title={meta.primaryAction}
        subtitle="Add only the details you know. You can review it later in Reminders."
        onClose={() => setAddingReminder(false)}
      >
        <form onSubmit={saveReminder} className="space-y-4">
          <label className="block text-xs font-semibold text-[#20352a]">
            <span className="mb-1.5 block">Title</span>
            <input
              required
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              className="form-control"
              placeholder={`e.g. ${section.id === "bins" ? "Recycling collection" : section.id === "pets" ? "Vet appointment" : "Garden job"}`}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-[#20352a]">
              <span className="mb-1.5 block">Date</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                className="form-control"
              />
            </label>
            <label className="block text-xs font-semibold text-[#20352a]">
              <span className="mb-1.5 block">Time</span>
              <input
                type="time"
                value={draft.time}
                onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                className="form-control"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-[#20352a]">
              <span className="mb-1.5 block">Repeat</span>
              <input
                value={draft.repeat}
                onChange={(event) => setDraft({ ...draft, repeat: event.target.value })}
                className="form-control"
                placeholder="Optional"
              />
            </label>
            <label className="block text-xs font-semibold text-[#20352a]">
              <span className="mb-1.5 block">Priority</span>
              <select
                value={draft.priority}
                onChange={(event) => setDraft({ ...draft, priority: event.target.value as Reminder["priority"] })}
                className="form-control"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-[#20352a]">
            <span className="mb-1.5 block">Notes</span>
            <textarea
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              className="form-control min-h-24 resize-y"
              placeholder="Anything useful to remember"
            />
          </label>
          {message ? <p className="text-xs text-[#8a5149]">{message}</p> : null}
          <button type="submit" className="min-h-12 w-full rounded-2xl bg-[#315443] text-sm font-semibold text-white">
            Save reminder
          </button>
        </form>
      </ModalShell>

      <BottomNav />
    </main>
  );
}
