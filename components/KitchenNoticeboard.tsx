"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { BottomNav } from "@/components/BottomNav";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import type { KitchenNotice, NoticeCategory } from "@/lib/diarydock-data";
import type { Reminder, ReminderGroup } from "@/lib/mock-data";
import { deleteStructuredReminder, upsertStructuredReminder } from "@/lib/structured-data";

const categories: Array<"All" | NoticeCategory> = ["All", "School", "Home", "Health", "Plans"];
const colourStyles: Record<KitchenNotice["colour"], string> = {
  cream: "bg-[#fff8df] border-[#eadcb5]",
  sage: "bg-[#e8f0df] border-[#c9d6b9]",
  blue: "bg-[#e8f1f4] border-[#cadce2]",
  clay: "bg-[#f4e4da] border-[#dfc6b6]"
};
const pinStyles: Record<KitchenNotice["colour"], string> = {
  cream: "bg-[#d5a842]",
  sage: "bg-[#718b62]",
  blue: "bg-[#6f8f9b]",
  clay: "bg-[#b87961]"
};
const emptyDraft: Omit<KitchenNotice, "id" | "createdAt"> = {
  title: "",
  detail: "",
  category: "Home",
  assignedTo: "Family",
  due: "",
  colour: "sage",
  pinned: true,
  completed: false,
  archived: false,
  source: "manual"
};

type CaptureMode = "photo" | "voice";

function resolveNoticeDate(label: string) {
  if (!label) return null;
  const normalized = label.toLowerCase();
  const date = new Date();
  date.setHours(12, 0, 0, 0);

  if (normalized === "today" || normalized === "tonight") return date;
  if (normalized === "tomorrow") {
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (normalized === "this week") {
    date.setDate(date.getDate() + 3);
    return date;
  }
  if (normalized === "this weekend") {
    const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntilSaturday);
    return date;
  }
  if (normalized === "next week") {
    date.setDate(date.getDate() + 7);
    return date;
  }

  const datedLabel = label.match(/^[A-Za-z]{3}\s+(\d{1,2})\s+([A-Za-z]{3})$/);
  if (datedLabel) {
    const parsed = new Date(`${datedLabel[1]} ${datedLabel[2]} ${date.getFullYear()} 12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      if (parsed.getTime() < date.getTime() - 24 * 60 * 60 * 1000) parsed.setFullYear(parsed.getFullYear() + 1);
      return parsed;
    }
  }

  const weekdayIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].findIndex((day) =>
    normalized.startsWith(day)
  );
  if (weekdayIndex >= 0) {
    const offset = (weekdayIndex - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + offset);
    return date;
  }

  return null;
}

function toDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function reminderGroupFor(label: string): ReminderGroup {
  const normalized = label.toLowerCase();
  if (normalized === "today" || normalized === "tonight") return "today";
  const date = resolveNoticeDate(label);
  if (date && date.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000) return "week";
  return normalized.includes("week") ? "week" : "later";
}

function noticeTime(notice: Pick<KitchenNotice, "title" | "detail" | "due">) {
  const match = `${notice.due} ${notice.title} ${notice.detail}`.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (!match) return "09:00";
  let hour = Number(match[1]);
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function calendarCategory(category: NoticeCategory) {
  if (category === "School") return "school" as const;
  if (category === "Health") return "appointments" as const;
  return "family" as const;
}

function getNoticePlacement(index: number, total: number): CSSProperties {
  if (total <= 4) {
    const simplePositions = [
      { left: 1, top: 1, rotate: -0.8 },
      { left: 51, top: 2, rotate: 0.8 },
      { left: 2, top: 51, rotate: 0.7 },
      { left: 52, top: 50, rotate: -0.7 }
    ];
    const position = simplePositions[index];
    return {
      left: `${position.left}%`,
      top: `${position.top}%`,
      width: "47%",
      height: "47%",
      transform: `rotate(${position.rotate}deg)`,
      zIndex: total - index
    };
  }

  const naturalBoardPositions = [
    { left: 1, top: 1, width: 47, height: 27, rotate: -1.2 },
    { left: 51, top: 2, width: 47, height: 27, rotate: 1.1 },
    { left: 2, top: 30, width: 47, height: 27, rotate: 0.8 },
    { left: 51, top: 30, width: 47, height: 27, rotate: -0.9 },
    { left: 1, top: 59, width: 31, height: 23, rotate: -1.8 },
    { left: 34.5, top: 58, width: 31, height: 24, rotate: 1.3 },
    { left: 68, top: 59, width: 31, height: 23, rotate: -1 },
    { left: 18, top: 83, width: 64, height: 15, rotate: 0.5 }
  ];
  const position = naturalBoardPositions[index];

  if (position) {
    return {
      left: `${position.left}%`,
      top: `${position.top}%`,
      width: `${position.width}%`,
      height: `${position.height}%`,
      transform: `rotate(${position.rotate}deg)`,
      zIndex: total - index
    };
  }

  // Further notes overlap the established arrangement without leaving the cork.
  const extraIndex = index - naturalBoardPositions.length;
  const left = 3 + ((extraIndex * 29 + 11) % 63);
  const top = 8 + ((extraIndex * 19 + 17) % 66);
  const rotate = ((extraIndex * 7) % 11) - 5;

  return {
    left: `${left}%`,
    top: `${top}%`,
    width: "32%",
    height: "22%",
    transform: `rotate(${rotate}deg)`,
    zIndex: total - index
  };
}

export function KitchenNoticeboard() {
  const { state, updateState, hydrated } = useDiaryDockData();
  const [filter, setFilter] = useState<(typeof categories)[number]>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [processing, setProcessing] = useState<CaptureMode | null>(null);
  const [recording, setRecording] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [linkReminder, setLinkReminder] = useState(false);
  const [linkCalendar, setLinkCalendar] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const archiveBefore = Date.now() - 24 * 60 * 60 * 1000;
    const needsHousekeeping = state.kitchenNoticeboard.some(
      (notice) =>
        notice.completed &&
        !notice.archived &&
        notice.completedAt &&
        new Date(notice.completedAt).getTime() < archiveBefore
    );
    if (!needsHousekeeping) return;

    updateState((current) => ({
      ...current,
      kitchenNoticeboard: current.kitchenNoticeboard.map((notice) =>
        notice.completed &&
        !notice.archived &&
        notice.completedAt &&
        new Date(notice.completedAt).getTime() < archiveBefore
          ? { ...notice, archived: true, archivedAt: new Date().toISOString() }
          : notice
      )
    }));
  }, [hydrated, state.kitchenNoticeboard, updateState]);

  const visibleNotes = state.kitchenNoticeboard
    .filter((note) => !note.archived && (filter === "All" || note.category === filter))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const openCreate = () => {
    if (!hydrated) return;
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setCaptureError("");
    setProcessing(null);
    setRecording(false);
    setLinkReminder(false);
    setLinkCalendar(false);
    setSheetOpen(true);
  };

  const openEdit = (notice: KitchenNotice) => {
    setEditingId(notice.id);
    setDraft({
      title: notice.title,
      detail: notice.detail,
      category: notice.category,
      assignedTo: notice.assignedTo,
      due: notice.due,
      colour: notice.colour,
      pinned: notice.pinned,
      completed: notice.completed,
      archived: notice.archived,
      completedAt: notice.completedAt,
      archivedAt: notice.archivedAt,
      source: notice.source ?? "manual"
    });
    setCaptureError("");
    setLinkReminder(Boolean(notice.linkedReminderId));
    setLinkCalendar(Boolean(notice.linkedCalendarEventId));
    setSheetOpen(true);
  };

  const analyseCapture = async (file: File, mode: CaptureMode) => {
    setProcessing(mode);
    setCaptureError("");

    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("file", file);
      const response = await fetch("/api/kitchen/noticeboard/extract", {
        method: "POST",
        body: formData
      });
      const payload = await response.json().catch(() => null) as {
        notice?: Pick<KitchenNotice, "title" | "detail" | "category" | "assignedTo" | "due" | "colour">;
        error?: string;
      } | null;

      if (!response.ok || !payload?.notice) {
        throw new Error(payload?.error || "That notice could not be prepared.");
      }

      setDraft((current) => ({
        ...current,
        ...payload.notice,
        source: mode
      }));
      if (payload.notice.due) {
        setLinkReminder(true);
        setLinkCalendar(Boolean(resolveNoticeDate(payload.notice.due)));
      }
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "That notice could not be prepared.");
    } finally {
      setProcessing(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const startVoiceCapture = async () => {
    setCaptureError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCaptureError("Voice capture is not supported on this device yet.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const preferredType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || preferredType || "audio/webm";
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        const file = new File(audioChunksRef.current, `notice.${extension}`, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        void analyseCapture(file, "voice");
      };
      recorder.start();
      setRecording(true);
    } catch {
      setCaptureError("Microphone access was not available. You can still type the notice.");
    }
  };

  const stopVoiceCapture = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const saveNotice = () => {
    const title = draft.title.trim();
    if (!title) return;
    const noticeId = editingId ?? `notice-${Date.now()}`;
    const existingNotice = editingId
      ? state.kitchenNoticeboard.find((notice) => notice.id === editingId)
      : undefined;
    const completedAt = draft.completed ? draft.completedAt ?? new Date().toISOString() : undefined;
    const linkedReminderId = linkReminder && draft.due
      ? existingNotice?.linkedReminderId ?? `notice-reminder-${noticeId}`
      : undefined;
    const dueDate = resolveNoticeDate(draft.due);
    const linkedCalendarEventId = linkCalendar && dueDate
      ? existingNotice?.linkedCalendarEventId ?? `notice-calendar-${noticeId}`
      : undefined;
    const nextNotice: KitchenNotice = {
      ...draft,
      id: noticeId,
      title,
      detail: draft.detail.trim(),
      createdAt: existingNotice?.createdAt ?? new Date().toISOString(),
      completedAt,
      linkedReminderId,
      linkedCalendarEventId
    };
    const nextReminder: Reminder | null = linkedReminderId
      ? {
          id: linkedReminderId,
          title,
          note: [draft.detail.trim(), `For ${draft.assignedTo}`].filter(Boolean).join(" - "),
          roomId: "kitchen",
          roomName: "Kitchen",
          group: draft.completed ? "done" : reminderGroupFor(draft.due),
          timeLabel: draft.completed ? "Completed" : draft.due,
          priority: draft.category === "Health" || draft.category === "School" ? "high" : "normal",
          assignedTo: draft.assignedTo,
          sourceNoticeId: noticeId
        }
      : null;
    const nextCalendarEvent = linkedCalendarEventId && dueDate
      ? {
          id: linkedCalendarEventId,
          title,
          date: toDateKey(dueDate),
          time: noticeTime(nextNotice),
          category: calendarCategory(draft.category),
          assignedTo: draft.assignedTo,
          noticeId
        }
      : null;

    updateState((current) => ({
      ...current,
      kitchenNoticeboard: editingId
        ? current.kitchenNoticeboard.map((notice) =>
            notice.id === editingId ? nextNotice : notice
          )
        : [nextNotice, ...current.kitchenNoticeboard],
      reminders: nextReminder
        ? [nextReminder, ...current.reminders.filter((reminder) => reminder.id !== nextReminder.id)]
        : existingNotice?.linkedReminderId
          ? current.reminders.filter((reminder) => reminder.id !== existingNotice.linkedReminderId)
          : current.reminders,
      familyCalendarEvents: nextCalendarEvent
        ? [nextCalendarEvent, ...current.familyCalendarEvents.filter((event) => event.id !== nextCalendarEvent.id)]
        : existingNotice?.linkedCalendarEventId
          ? current.familyCalendarEvents.filter((event) => event.id !== existingNotice.linkedCalendarEventId)
          : current.familyCalendarEvents
    }));

    if (nextReminder) {
      void upsertStructuredReminder(nextReminder).catch(() => undefined);
    } else if (existingNotice?.linkedReminderId) {
      void deleteStructuredReminder(existingNotice.linkedReminderId).catch(() => undefined);
    }
    setSheetOpen(false);
  };

  const archiveNotice = () => {
    if (!editingId) return;
    updateState((current) => ({
      ...current,
      kitchenNoticeboard: current.kitchenNoticeboard.map((notice) =>
        notice.id === editingId ? { ...notice, archived: true, archivedAt: new Date().toISOString() } : notice
      )
    }));
    setSheetOpen(false);
  };

  const restoreNotice = (id: string) => {
    updateState((current) => ({
      ...current,
      kitchenNoticeboard: current.kitchenNoticeboard.map((notice) =>
        notice.id === id ? { ...notice, archived: false, archivedAt: undefined } : notice
      )
    }));
  };

  const archivedNotices = state.kitchenNoticeboard.filter((notice) => notice.archived);
  const thisWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completedThisWeek = state.kitchenNoticeboard.filter(
    (notice) => notice.completedAt && new Date(notice.completedAt).getTime() >= thisWeek
  );
  const assigneeOptions = Array.from(new Set([
    "Family",
    ...state.householdProfiles
      .filter((profile) => profile.showInReminders)
      .map((profile) => profile.name),
    ...state.householdMembers.map((member) => member.name)
  ]));
  const upcomingDays = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset + 1);
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  });
  const standardWhenOptions = ["", "Today", "Tonight", "Tomorrow", ...upcomingDays, "This week", "This weekend", "Next week"];
  const whenOptions = Array.from(new Set(draft.due && !standardWhenOptions.includes(draft.due) ? [draft.due, ...standardWhenOptions] : standardWhenOptions));

  return (
    <div className="fixed inset-0 overflow-hidden bg-[linear-gradient(145deg,#eef4eb_0%,#fbfcf8_48%,#e7efe4_100%)] text-slate-900">
      <main className="mx-auto flex h-[calc(100svh-72px)] w-full max-w-lg flex-col px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))]">
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/room/kitchen"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-700 shadow-sm backdrop-blur-xl"
              aria-label="Back to Kitchen"
            >
              <UiIcon name="arrow-left" className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#66805c]">Kitchen</p>
              <h1 className="truncate text-[22px] font-semibold tracking-[-0.03em]">Family noticeboard</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/90 bg-white/72 text-slate-600 shadow-sm backdrop-blur-xl"
              aria-label="Open notice archive and weekly summary"
            >
              <UiIcon name="archive" className="h-4 w-4" />
              {archivedNotices.length ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#718b62] px-1 text-[8px] font-bold text-white">{archivedNotices.length}</span> : null}
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={!hydrated}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#263b35] text-white shadow-[0_12px_24px_-12px_rgba(38,59,53,0.75)] disabled:cursor-wait disabled:opacity-45"
              aria-label={hydrated ? "Add a note" : "Loading noticeboard"}
            >
              <UiIcon name="plus" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="mt-3 flex shrink-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => setFilter(category)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition ${
                filter === category
                  ? "border-[#263b35] bg-[#263b35] text-white"
                  : "border-white/90 bg-white/72 text-slate-600 shadow-sm backdrop-blur-xl"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <section className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[30px] border-[7px] border-[#9b7453] bg-[#b9885f] p-4 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.16),0_20px_45px_-26px_rgba(53,39,25,0.7)]">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_30%,#6c4328_0_1px,transparent_1.5px),radial-gradient(circle_at_75%_60%,#f2d2aa_0_1px,transparent_1.5px)] [background-size:13px_15px,17px_19px]" />
          <div className="relative h-full">
            {visibleNotes.map((notice, index) => {
              const compact = visibleNotes.length > 4 && index >= 4;
              return (
                <button
                  type="button"
                  key={notice.id}
                  onClick={() => openEdit(notice)}
                  style={getNoticePlacement(index, visibleNotes.length)}
                  className={`absolute flex min-h-0 flex-col overflow-hidden rounded-[4px] border text-left shadow-[0_10px_18px_-10px_rgba(48,31,18,0.72)] transition hover:z-50 active:brightness-95 ${compact ? "p-2.5 pt-4" : "p-3 pt-5"} ${colourStyles[notice.colour]} ${
                    notice.completed ? "opacity-70" : ""
                  }`}
                >
                  <span className={`absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full border-2 border-white/65 shadow-[0_3px_4px_rgba(31,24,18,0.35)] ${compact ? "h-3 w-3" : "h-3.5 w-3.5"} ${pinStyles[notice.colour]}`} />
                  <span className={`${compact ? "text-[7px]" : "text-[8px]"} font-bold uppercase tracking-[0.16em] text-slate-500`}>{notice.category}</span>
                  <strong className={`line-clamp-2 leading-[1.16] tracking-[-0.02em] text-slate-800 ${compact ? "mt-1 text-[11px]" : "mt-1.5 text-[14px]"} ${notice.completed ? "line-through" : ""}`}>
                    {notice.title}
                  </strong>
                  {notice.detail && !compact ? <span className="mt-1 line-clamp-2 text-[9px] leading-3.5 text-slate-600">{notice.detail}</span> : null}
                  <span className={`mt-auto flex items-end justify-between gap-1 pt-1 font-semibold text-slate-500 ${compact ? "text-[7px]" : "text-[8px]"}`}>
                    <span className="truncate">{notice.assignedTo}</span>
                    <span className="shrink-0">{notice.due}</span>
                  </span>
                  {notice.completed ? (
                    <span className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#607b55] text-white">
                      <UiIcon name="check" className="h-3 w-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
            {visibleNotes.length === 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="absolute left-1/2 top-1/2 flex w-[220px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[22px] bg-white/80 p-6 text-center shadow-lg backdrop-blur-xl"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#263b35] text-white"><UiIcon name="plus" className="h-5 w-5" /></span>
                <strong className="mt-3 text-sm">Pin the first note</strong>
                <span className="mt-1 text-[11px] text-slate-500">Nothing is pinned in {filter === "All" ? "the board" : filter} yet.</span>
              </button>
            ) : null}
          </div>
        </section>
      </main>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/25 p-2 backdrop-blur-[2px]" onClick={() => setSheetOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit notice" : "Add notice"}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[calc(100svh-12px)] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/90 bg-[#fbfcf9]/98 p-4 pb-[max(18px,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#66805c]">{editingId ? "Update pin" : "New pin"}</p>
                <h2 className="text-lg font-semibold">{editingId ? "Edit family note" : "Add to the board"}</h2>
              </div>
              <button type="button" onClick={() => setSheetOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500" aria-label="Close">x</button>
            </div>

            {!editingId ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={Boolean(processing) || recording}
                  className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-[#dce5d8] bg-[#edf4e9] text-[10px] font-semibold text-[#58704f] disabled:opacity-45"
                >
                  <UiIcon name="camera" className="h-5 w-5" />
                  Take a photo
                </button>
                <button
                  type="button"
                  onClick={recording ? stopVoiceCapture : startVoiceCapture}
                  disabled={Boolean(processing)}
                  className={`flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[18px] border text-[10px] font-semibold disabled:opacity-45 ${
                    recording ? "border-red-200 bg-red-50 text-red-600" : "border-[#ead7c5] bg-[#f5e8dc] text-[#8c6549]"
                  }`}
                >
                  <span className={recording ? "animate-pulse" : ""}><UiIcon name="microphone" className="h-5 w-5" /></span>
                  {recording ? "Tap to finish" : "Speak"}
                </button>
                <button
                  type="button"
                  onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="What should everyone know?"]')?.focus()}
                  disabled={Boolean(processing) || recording}
                  className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-[#d7dfe8] bg-[#edf2f5] text-[10px] font-semibold text-[#5a7080] disabled:opacity-45"
                >
                  <UiIcon name="file" className="h-5 w-5" />
                  Type
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void analyseCapture(file, "photo");
                  }}
                />
              </div>
            ) : null}

            {processing ? (
              <div className="mt-3 overflow-hidden rounded-[20px] border border-[#dce5d8] bg-[linear-gradient(110deg,#edf4e9,#f9fbf7,#e7f0e2)] p-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#607b55] shadow-sm">
                    <span className="absolute inset-0 animate-ping rounded-full border border-[#91aa85]/50" />
                    <UiIcon name={processing === "photo" ? "camera" : "microphone"} className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{processing === "photo" ? "Reading your photo" : "Preparing your voice note"}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Finding the useful details for you...</p>
                  </div>
                </div>
                <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white">
                  <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#78936d]" />
                </span>
              </div>
            ) : null}
            {captureError ? <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[10px] font-medium text-red-600">{captureError}</p> : null}

            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="What should everyone know?"
              maxLength={54}
              disabled={Boolean(processing) || recording}
              className="mt-3 h-12 w-full rounded-2xl border border-[#dce5d8] bg-white px-4 text-sm font-semibold outline-none focus:border-[#829d76] disabled:opacity-45"
            />
            <textarea
              value={draft.detail}
              onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))}
              placeholder="Add a short detail"
              maxLength={120}
              disabled={Boolean(processing) || recording}
              className="mt-2 h-16 w-full resize-none rounded-2xl border border-[#dce5d8] bg-white px-4 py-3 text-xs leading-5 outline-none focus:border-[#829d76] disabled:opacity-45"
            />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="rounded-2xl bg-[#f1f4ee] px-3 py-2">
                <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">Category</span>
                <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as NoticeCategory }))} className="mt-0.5 w-full bg-transparent text-[11px] font-semibold outline-none">
                  {categories.slice(1).map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="rounded-2xl bg-[#f1f4ee] px-3 py-2">
                <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">For</span>
                <select value={draft.assignedTo} onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))} className="mt-0.5 w-full bg-transparent text-[11px] font-semibold outline-none">
                  {!assigneeOptions.includes(draft.assignedTo) ? <option value={draft.assignedTo}>{draft.assignedTo}</option> : null}
                  {assigneeOptions.map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}
                </select>
              </label>
              <label className="rounded-2xl bg-[#f1f4ee] px-3 py-2">
                <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-500">When</span>
                <select value={draft.due} onChange={(event) => {
                  const due = event.target.value;
                  setDraft((current) => ({ ...current, due }));
                  setLinkReminder(Boolean(due));
                  setLinkCalendar(Boolean(resolveNoticeDate(due)));
                }} className="mt-0.5 w-full bg-transparent text-[11px] font-semibold outline-none">
                  {whenOptions.map((when) => <option key={when || "no-date"} value={when}>{when || "No date"}</option>)}
                </select>
              </label>
            </div>

            {draft.due ? (
              <div className="mt-3 rounded-[20px] border border-[#dce5d8] bg-white p-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#66805c]">Suggested actions</span>
                  <span className="text-[8px] text-slate-400">Confirm before saving</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setLinkReminder((current) => !current)} className={`flex h-10 items-center justify-center gap-2 rounded-2xl text-[10px] font-semibold ${linkReminder ? "bg-[#e8f0df] text-[#4f6947] ring-1 ring-[#b9caad]" : "bg-slate-100 text-slate-500"}`}>
                    <UiIcon name="bell" className="h-3.5 w-3.5" />
                    {linkReminder ? "Reminder on" : "Add reminder"}
                  </button>
                  <button type="button" disabled={!resolveNoticeDate(draft.due)} onClick={() => setLinkCalendar((current) => !current)} className={`flex h-10 items-center justify-center gap-2 rounded-2xl text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${linkCalendar ? "bg-[#e8edf3] text-[#526d80] ring-1 ring-[#c5d3de]" : "bg-slate-100 text-slate-500"}`}>
                    <UiIcon name="calendar" className="h-3.5 w-3.5" />
                    {linkCalendar ? "Calendar on" : "Add to calendar"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setDraft((current) => ({ ...current, completed: !current.completed, completedAt: current.completed ? undefined : current.completedAt }))} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[10px] font-semibold ${draft.completed ? "bg-[#607b55] text-white" : "bg-[#edf2ea] text-[#58704f]"}`}>
                <UiIcon name="check" className="h-3.5 w-3.5" />{draft.completed ? "Completed" : "Complete"}
              </button>
              <button type="button" onClick={() => setDraft((current) => ({ ...current, pinned: !current.pinned }))} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[10px] font-semibold ${draft.pinned ? "bg-[#f0e5ca] text-[#8a6c32]" : "bg-slate-100 text-slate-600"}`}>
                <UiIcon name="star" className="h-3.5 w-3.5" />{draft.pinned ? "Pinned" : "Pin note"}
              </button>
              {editingId ? <button type="button" onClick={archiveNotice} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 text-[10px] font-semibold text-slate-600"><UiIcon name="archive" className="h-3.5 w-3.5" />Archive</button> : null}
            </div>
            <button type="button" onClick={saveNotice} disabled={!draft.title.trim() || Boolean(processing) || recording} className="mt-3 h-12 w-full rounded-2xl bg-[#263b35] text-sm font-semibold text-white shadow-lg disabled:opacity-40">
              {editingId ? "Save changes" : "Pin to noticeboard"}
            </button>
          </section>
        </div>
      ) : null}

      {archiveOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/25 p-2 backdrop-blur-[2px]" onClick={() => setArchiveOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Notice archive and weekly summary" onClick={(event) => event.stopPropagation()} className="max-h-[calc(100svh-12px)] w-full max-w-lg overflow-y-auto rounded-[30px] border border-white/90 bg-[#fbfcf9]/98 p-4 pb-[max(18px,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#66805c]">This week at home</p>
                <h2 className="mt-0.5 text-lg font-semibold">Family board summary</h2>
              </div>
              <button type="button" onClick={() => setArchiveOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500" aria-label="Close archive">x</button>
            </div>

            <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <div className="rounded-[20px] bg-[#e8f0df] p-3">
                <strong className="block text-2xl tracking-tight text-[#4f6947]">{completedThisWeek.length}</strong>
                <span className="text-[10px] font-semibold text-[#607b55]">completed this week</span>
              </div>
              <div className="rounded-[20px] bg-[#f3eadf] p-3">
                <strong className="block text-xs text-slate-800">
                  {completedThisWeek.length
                    ? `${completedThisWeek.slice(0, 2).map((notice) => notice.title).join(" and ")} moved forward.`
                    : "The board is ready for the week ahead."}
                </strong>
                <span className="mt-1 block text-[9px] text-slate-500">Completed notes fade for a day, then move here automatically.</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Archive</h3>
              <span className="text-[10px] text-slate-400">{archivedNotices.length} notes</span>
            </div>
            <div className="mt-2 max-h-[38svh] space-y-2 overflow-y-auto">
              {archivedNotices.map((notice) => (
                <article key={notice.id} className="flex items-center gap-3 rounded-[18px] border border-[#e4e8e1] bg-white p-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${pinStyles[notice.colour]}`} />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-semibold text-slate-700">{notice.title}</h4>
                    <p className="mt-0.5 text-[9px] text-slate-400">{notice.category} · {notice.assignedTo}</p>
                  </div>
                  <button type="button" onClick={() => restoreNotice(notice.id)} className="rounded-full bg-[#edf4e9] px-3 py-1.5 text-[9px] font-semibold text-[#58704f]">Restore</button>
                </article>
              ))}
              {!archivedNotices.length ? <p className="rounded-[18px] bg-slate-50 px-4 py-6 text-center text-[11px] text-slate-500">Completed notes will collect here automatically.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {!sheetOpen && !archiveOpen ? <BottomNav /> : null}
    </div>
  );
}
