"use client";

import { useEffect, useRef, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { KitchenNotice } from "@/lib/diarydock-data";
import { deleteStructuredReminder, upsertStructuredReminder } from "@/lib/structured-data";
import {
  buildNoticeArtifacts,
  emptyNoticeDraft,
  noticeCategories,
  resolveNoticeDate,
  type NoticeDraft,
} from "./noticeboard-rules";

export type NoticeCaptureMode = "photo" | "voice";

function editDraft(notice: KitchenNotice): NoticeDraft {
  return {
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
    source: notice.source ?? "manual",
  };
}

export function useNoticeboardController() {
  const { state, updateState, hydrated } = useDiaryDockData();
  const [filter, setFilter] = useState<(typeof noticeCategories)[number]>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoticeDraft>(emptyNoticeDraft);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [processing, setProcessing] = useState<NoticeCaptureMode | null>(null);
  const [recording, setRecording] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [linkReminder, setLinkReminder] = useState(false);
  const [linkCalendar, setLinkCalendar] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const body = document.body.style.overflow;
    const html = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = body;
      document.documentElement.style.overflow = html;
    };
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const archiveBefore = Date.now() - 86_400_000;
    const shouldArchive = state.kitchenNoticeboard.some((notice) => notice.completed
      && !notice.archived && notice.completedAt
      && new Date(notice.completedAt).getTime() < archiveBefore);
    if (!shouldArchive) return;
    updateState((current) => ({
      ...current,
      kitchenNoticeboard: current.kitchenNoticeboard.map((notice) => notice.completed
        && !notice.archived && notice.completedAt
        && new Date(notice.completedAt).getTime() < archiveBefore
        ? { ...notice, archived: true, archivedAt: new Date().toISOString() } : notice),
    }));
  }, [hydrated, state.kitchenNoticeboard, updateState]);

  const visibleNotes = state.kitchenNoticeboard
    .filter((notice) => !notice.archived && (filter === "All" || notice.category === filter))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned));
  const archivedNotices = state.kitchenNoticeboard.filter((notice) => notice.archived);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const completedThisWeek = state.kitchenNoticeboard.filter((notice) => notice.completedAt
    && new Date(notice.completedAt).getTime() >= weekAgo);
  const assigneeOptions = Array.from(new Set([
    "Family",
    ...state.householdProfiles.filter((profile) => profile.showInReminders).map((profile) => profile.name),
    ...state.householdMembers.map((member) => member.name),
  ]));
  const upcomingDays = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset + 1);
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  });
  const standardWhen = ["", "Today", "Tonight", "Tomorrow", ...upcomingDays,
    "This week", "This weekend", "Next week"];
  const whenOptions = Array.from(new Set(draft.due && !standardWhen.includes(draft.due)
    ? [draft.due, ...standardWhen] : standardWhen));

  function openCreate() {
    if (!hydrated) return;
    setEditingId(null);
    setDraft({ ...emptyNoticeDraft });
    setCaptureError("");
    setProcessing(null);
    setRecording(false);
    setLinkReminder(false);
    setLinkCalendar(false);
    setSheetOpen(true);
  }

  function openEdit(notice: KitchenNotice) {
    setEditingId(notice.id);
    setDraft(editDraft(notice));
    setCaptureError("");
    setLinkReminder(Boolean(notice.linkedReminderId));
    setLinkCalendar(Boolean(notice.linkedCalendarEventId));
    setSheetOpen(true);
  }

  async function analyseCapture(file: File, mode: NoticeCaptureMode) {
    setProcessing(mode);
    setCaptureError("");
    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("file", file);
      const response = await fetch("/api/kitchen/noticeboard/extract", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null) as {
        notice?: Pick<KitchenNotice, "title" | "detail" | "category" | "assignedTo" | "due" | "colour">;
        error?: string;
      } | null;
      if (!response.ok || !payload?.notice) {
        throw new Error(payload?.error || "That notice could not be prepared.");
      }
      setDraft((current) => ({ ...current, ...payload.notice, source: mode }));
      if (payload.notice.due) {
        setLinkReminder(true);
        setLinkCalendar(Boolean(resolveNoticeDate(payload.notice.due)));
      }
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "That notice could not be prepared.");
    } finally {
      setProcessing(null);
    }
  }

  async function startVoiceCapture() {
    setCaptureError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setCaptureError("Voice capture is not supported on this device yet.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const preferred = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || preferred || "audio/webm";
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
  }

  function stopVoiceCapture() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function saveNotice() {
    if (!draft.title.trim()) return;
    const existing = editingId
      ? state.kitchenNoticeboard.find((notice) => notice.id === editingId) : undefined;
    const noticeId = editingId ?? `notice-${Date.now()}`;
    const next = buildNoticeArtifacts({
      draft, existing, linkCalendar, linkReminder, noticeId,
    });
    updateState((current) => ({
      ...current,
      kitchenNoticeboard: editingId
        ? current.kitchenNoticeboard.map((notice) => notice.id === editingId ? next.notice : notice)
        : [next.notice, ...current.kitchenNoticeboard],
      reminders: next.reminder
        ? [next.reminder, ...current.reminders.filter((item) => item.id !== next.reminder?.id)]
        : existing?.linkedReminderId
          ? current.reminders.filter((item) => item.id !== existing.linkedReminderId) : current.reminders,
      familyCalendarEvents: next.calendarEvent
        ? [next.calendarEvent, ...current.familyCalendarEvents.filter((item) => item.id !== next.calendarEvent?.id)]
        : existing?.linkedCalendarEventId
          ? current.familyCalendarEvents.filter((item) => item.id !== existing.linkedCalendarEventId)
          : current.familyCalendarEvents,
    }));
    if (next.reminder) void upsertStructuredReminder(next.reminder).catch(() => undefined);
    else if (existing?.linkedReminderId) {
      void deleteStructuredReminder(existing.linkedReminderId).catch(() => undefined);
    }
    setSheetOpen(false);
  }

  function archiveNotice() {
    if (!editingId) return;
    updateState((current) => ({ ...current,
      kitchenNoticeboard: current.kitchenNoticeboard.map((notice) => notice.id === editingId
        ? { ...notice, archived: true, archivedAt: new Date().toISOString() } : notice) }));
    setSheetOpen(false);
  }

  function restoreNotice(id: string) {
    updateState((current) => ({ ...current,
      kitchenNoticeboard: current.kitchenNoticeboard.map((notice) => notice.id === id
        ? { ...notice, archived: false, archivedAt: undefined } : notice) }));
  }

  return {
    analyseCapture, archiveNotice, archivedNotices, archiveOpen, assigneeOptions,
    captureError, completedThisWeek, draft, editingId, filter, hydrated, linkCalendar,
    linkReminder, openCreate, openEdit, processing, recording, restoreNotice, saveNotice,
    setArchiveOpen, setDraft, setFilter, setLinkCalendar, setLinkReminder, setSheetOpen,
    sheetOpen, startVoiceCapture, stopVoiceCapture, visibleNotes, whenOptions,
  };
}
