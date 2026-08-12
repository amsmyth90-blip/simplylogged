"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";

import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import {
  correspondenceFolders,
  type CorrespondenceFolder,
  type CorrespondenceRecord,
  type CorrespondenceStatus,
} from "@/lib/correspondence-records";
import type { DocumentExtractionResult } from "@/lib/document-extraction";
import {
  openPrivateDocument,
  uploadPrivateDocument,
} from "@/lib/document-storage";
import type { Reminder, VaultDocument } from "@/lib/mock-data";
import {
  upsertStructuredDocument,
  upsertStructuredReminder,
} from "@/lib/structured-data";

type CorrespondenceView =
  | "dashboard"
  | "folders"
  | "new"
  | "detail"
  | "summary";

function dateTime(value: string) {
  return value
    ? new Date(`${value}T12:00:00`).getTime()
    : Number.POSITIVE_INFINITY;
}
function daysUntil(value: string) {
  return value
    ? Math.ceil((dateTime(value) - Date.now()) / 86400000)
    : Number.POSITIVE_INFINITY;
}
function formatDate(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}
function fileKind(file: File): VaultDocument["kind"] {
  return file.type === "application/pdf" ? "PDF" : "Image";
}
function fileSize(bytes: number) {
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function isDueSoon(item: CorrespondenceRecord) {
  const days = daysUntil(item.deadline);
  return item.status !== "completed" && days >= 0 && days <= 14;
}
function folderFromExtraction(
  extraction: DocumentExtractionResult,
): CorrespondenceFolder {
  const text =
    `${extraction.issuer} ${extraction.title} ${extraction.detectedDocumentType}`.toLowerCase();
  if (/hmrc|dwp|government|council|tax/.test(text)) return "Government & HMRC";
  if (/insurance|policy|insurer/.test(text)) return "Insurance";
  if (/electric|gas|water|utility|broadband|mobile|energy/.test(text))
    return "Utilities";
  if (/school|college|nursery|family/.test(text)) return "School & family";
  if (/employer|pension|payroll/.test(text)) return "Employers & pensions";
  if (extraction.category === "Home & Property") return "Property";
  if (extraction.category === "Finance") return "Banks & financial";
  return "Other";
}
function safeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function CorrespondenceNotice() {
  return (
    <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
      DiaryDock helps you organise correspondence and track actions and
      deadlines. It does not provide legal, tax or financial advice. Check
      summaries, dates and required actions against the original letter and seek
      qualified advice where appropriate.
    </p>
  );
}

function statusLabel(item: CorrespondenceRecord) {
  if (item.reviewStatus === "needs-review") return "Check details";
  if (item.status === "completed") return "Completed";
  if (isDueSoon(item)) return "Due soon";
  return item.status === "action-needed" ? "Action needed" : "Unread";
}
function statusClass(item: CorrespondenceRecord) {
  if (item.reviewStatus === "needs-review")
    return "bg-[#f2ead6] text-[#80683d]";
  if (item.status === "completed") return "bg-[#e6efe1] text-[#45604d]";
  if (isDueSoon(item) || item.status === "action-needed")
    return "bg-[#f7e4df] text-[#924a40]";
  return "bg-[#e9edf5] text-[#536a8c]";
}

function CorrespondenceRow({ item }: { item: CorrespondenceRecord }) {
  return (
    <Link
      href={`/office/correspondence/${item.id}`}
      className="flex min-h-[82px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]">
        <UiIcon
          name={
            item.folder === "Government & HMRC"
              ? "briefcase"
              : item.folder === "Insurance"
                ? "shield"
                : item.folder === "Property"
                  ? "home"
                  : "mail"
          }
          className="h-5 w-5"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352a]">
          {item.title || "Letter awaiting review"}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#667068]">
          {item.sender || "Sender not confirmed"} ·{" "}
          {item.receivedDate
            ? `Received ${formatDate(item.receivedDate)}`
            : "Date not recorded"}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold ${statusClass(item)}`}
      >
        {statusLabel(item)}
      </span>
    </Link>
  );
}

function Dashboard() {
  const { state, hydrated } = useDiaryDockData();
  const items = state.correspondence.correspondence;
  const confirmed = items.filter((item) => item.reviewStatus === "reviewed");
  const unread = confirmed.filter((item) => item.status === "unread");
  const actions = confirmed.filter((item) => item.status === "action-needed");
  const dueSoon = confirmed.filter(isDueSoon);
  const completed = confirmed.filter((item) => item.status === "completed");
  const recent = [...items]
    .sort((a, b) => dateTime(b.receivedDate) - dateTime(a.receivedDate))
    .slice(0, 5);
  if (!hydrated)
    return (
      <BillsShell>
        <BillsCard>
          <p className="text-sm text-[#667068]">Opening your correspondence…</p>
        </BillsCard>
      </BillsShell>
    );
  return (
    <BillsShell>
      <BillsHeader
        title="Important Correspondence"
        subtitle="Keep track of important letters, notices and messages that need your attention."
      />
      <BillsCard>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[16px] bg-[#f7f7f1] p-3">
            <UiIcon name="mail" className="h-4 w-4 text-[#52705a]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {unread.length}
            </p>
            <p className="text-[11px] text-[#667068]">Unread</p>
          </div>
          <div className="rounded-[16px] bg-[#fbf0da] p-3">
            <UiIcon name="alert" className="h-4 w-4 text-[#93641e]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {actions.length}
            </p>
            <p className="text-[11px] text-[#667068]">Awaiting action</p>
          </div>
          <div className="rounded-[16px] bg-[#f9e7e2] p-3">
            <UiIcon name="calendar" className="h-4 w-4 text-[#9a4f43]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {dueSoon.length}
            </p>
            <p className="text-[11px] text-[#667068]">Due soon</p>
          </div>
          <div className="rounded-[16px] bg-[#e7efe3] p-3">
            <UiIcon name="check" className="h-4 w-4 text-[#49644d]" />
            <p className="mt-2 text-2xl font-semibold text-[#20352a]">
              {completed.length}
            </p>
            <p className="text-[11px] text-[#667068]">Completed</p>
          </div>
        </div>
      </BillsCard>
      <BillsCard>
        <div className="flex items-center justify-between gap-3">
          <BillsSectionTitle
            icon="mail"
            title="Recent correspondence"
            detail={
              recent.length
                ? "Letters and notices most recently added"
                : "No correspondence added yet"
            }
          />
          <Link
            href="/office/correspondence/folders"
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-2.5">
          {recent.length ? (
            recent.map((item) => (
              <CorrespondenceRow key={item.id} item={item} />
            ))
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-7 text-center text-sm text-[#667068]">
              Add a letter manually or upload it for a helpful first read.
              Nothing is treated as confirmed until you check it.
            </p>
          )}
        </div>
        <Link
          href="/office/correspondence/new"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
        >
          <UiIcon name="plus" className="h-4 w-4" />
          Add correspondence
        </Link>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href="/office/correspondence/folders"
          icon="folder"
          title="Folders & categories"
          detail="Search and organise every letter"
          badge={`${items.length}`}
        />
        <BillsAction
          href="/office/correspondence/folders?status=action-needed"
          icon="alert"
          title="Actions and deadlines"
          detail="See correspondence needing attention"
          badge={`${actions.length + dueSoon.length}`}
        />
        <BillsAction
          href="/office/correspondence/new"
          icon="camera"
          title="Scan or upload"
          detail="Read a letter and check its details"
        />
        <BillsAction
          href="/reminders"
          icon="calendar"
          title="Linked reminders"
          detail="See correspondence deadlines in Reminders"
        />
      </div>
      <CorrespondenceNotice />
    </BillsShell>
  );
}

function Folders() {
  const { state } = useDiaryDockData();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All folders");
  const [status, setStatus] = useState(() =>
    searchParams.get("status") === "action-needed" ? "action-needed" : "All",
  );
  const [unreadOnly, setUnreadOnly] = useState(false);
  const items = state.correspondence.correspondence
    .filter((item) => folder === "All folders" || item.folder === folder)
    .filter((item) => status === "All" || item.status === status)
    .filter((item) => !unreadOnly || item.status === "unread")
    .filter((item) =>
      `${item.title} ${item.sender} ${item.folder} ${item.correspondenceType}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => dateTime(b.receivedDate) - dateTime(a.receivedDate));
  const folderCounts = useMemo(
    () =>
      correspondenceFolders.map((name) => ({
        name,
        count: state.correspondence.correspondence.filter(
          (item) => item.folder === name,
        ).length,
      })),
    [state.correspondence.correspondence],
  );
  return (
    <BillsShell>
      <BillsHeader
        title="Folders & Categories"
        subtitle="Search, filter and organise your important correspondence."
        backHref="/office/correspondence"
      />
      <BillsCard>
        <label className="text-xs font-semibold text-[#667068]">
          Search correspondence
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass}
            placeholder="Sender, title, type or folder"
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {folderCounts.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => setFolder(entry.name)}
              className={`min-h-[62px] rounded-[14px] px-3 text-left text-xs ${folder === entry.name ? "bg-[#355540] text-white" : "bg-[#f6f5ef] text-[#20352a]"}`}
            >
              <span className="block font-semibold">{entry.name}</span>
              <span
                className={`mt-1 block text-[10px] ${folder === entry.name ? "text-white/70" : "text-[#667068]"}`}
              >
                {entry.count} item{entry.count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFolder("All folders")}
          className="mt-3 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/25 text-xs font-semibold text-[#52705a]"
        >
          Show all folders
        </button>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={fieldClass}
            >
              <option value="All">All</option>
              <option value="unread">Unread</option>
              <option value="action-needed">Action needed</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 self-end rounded-[14px] border border-[#20352a]/10 bg-[#faf9f4] px-3 text-sm text-[#20352a]">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
              className="h-4 w-4 accent-[#45604d]"
            />
            Unread only
          </label>
        </div>
      </BillsCard>
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => <CorrespondenceRow key={item.id} item={item} />)
        ) : (
          <BillsCard>
            <p className="text-center text-sm text-[#667068]">
              No correspondence matches this view.
            </p>
          </BillsCard>
        )}
      </div>
      <Link
        href="/office/correspondence/new"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add correspondence
      </Link>
      <CorrespondenceNotice />
    </BillsShell>
  );
}

function NewCorrespondence() {
  const router = useRouter();
  const { updateState } = useDiaryDockData();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const makeDraft = (partial: Partial<CorrespondenceRecord> = {}) => {
    const now = new Date().toISOString();
    const item: CorrespondenceRecord = {
      id: crypto.randomUUID(),
      title: "",
      sender: "",
      correspondenceType: "Letter",
      folder: "Other",
      receivedDate: now.slice(0, 10),
      deadline: "",
      status: "unread",
      reviewStatus: "needs-review",
      summary: "",
      extractedText: "",
      actions: [],
      contactName: "",
      contactPhone: "",
      contactUrl: "",
      linkedReminderIds: [],
      responses: [],
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    updateState((current) => ({
      ...current,
      correspondence: {
        correspondence: [item, ...current.correspondence.correspondence],
      },
    }));
    return item;
  };
  const manual = () => {
    const item = makeDraft();
    router.push(`/office/correspondence/${item.id}`);
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setError("");
    const id = crypto.randomUUID();
    try {
      const stored = await uploadPrivateDocument(file, id);
      const form = new FormData();
      form.append("files", file);
      const response = await fetch("/api/capture/extract", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        extraction?: DocumentExtractionResult;
        error?: string;
      };
      if (!response.ok || !payload.extraction)
        throw new Error(payload.error || "The letter could not be read.");
      const extraction = payload.extraction;
      const now = new Date().toISOString();
      const item: CorrespondenceRecord = {
        id,
        documentId: id,
        title: extraction.title,
        sender: extraction.issuer,
        correspondenceType: extraction.detectedDocumentType || "Letter",
        folder: folderFromExtraction(extraction),
        receivedDate: now.slice(0, 10),
        deadline: extraction.dueDate,
        status:
          extraction.actionItems.length || extraction.dueDate
            ? "action-needed"
            : "unread",
        reviewStatus: "needs-review",
        summary: extraction.summary,
        extractedText: extraction.extractedText,
        actions: extraction.actionItems.map((label) => ({
          id: crypto.randomUUID(),
          label,
          completed: false,
        })),
        contactName: extraction.issuer,
        contactPhone: "",
        contactUrl: "",
        linkedReminderIds: [],
        responses: [],
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        createdAt: now,
        updatedAt: now,
      };
      const document: VaultDocument = {
        id,
        title: extraction.title || file.name,
        category: extraction.category,
        kind: fileKind(file),
        size: fileSize(file.size),
        updated: "Just now",
        storageBucket: stored.bucket,
        storagePath: stored.path,
        originalFileName: file.name,
        mimeType: file.type,
        roomId: "office",
        roomName: "Office",
        issuer: extraction.issuer,
        dueDate: extraction.dueDate,
        extractionSummary: extraction.summary,
        extractedText: extraction.extractedText,
        actionItems: extraction.actionItems,
        confidence: extraction.confidence,
        reviewStatus: "needs-review",
        reviewReasons: [
          "Check the sender, summary, deadline and actions against the original letter before confirming.",
        ],
      };
      updateState((current) => ({
        ...current,
        vaultDocuments: [
          document,
          ...current.vaultDocuments.filter((existing) => existing.id !== id),
        ],
        correspondence: {
          correspondence: [
            item,
            ...current.correspondence.correspondence.filter(
              (existing) => existing.id !== id,
            ),
          ],
        },
      }));
      await upsertStructuredDocument(document);
      router.push(`/office/correspondence/${id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to add this correspondence.",
      );
      setWorking(false);
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Add Correspondence"
        subtitle="Upload or photograph a letter for a helpful first read, or enter it manually."
        backHref="/office/correspondence"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="camera"
          title="Scan or upload a letter"
          detail="PDF, JPEG, PNG, WebP or HEIC · up to 10 MB"
        />
        <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#6f8e72]/45 bg-[#f7f7f1] px-5 text-center focus-within:ring-2 focus-within:ring-[#6f8e72]">
          <UiIcon name="plus" className="h-7 w-7 text-[#52705a]" />
          <span className="mt-3 text-sm font-semibold text-[#20352a]">
            {working ? "Reading your letter…" : "Choose a letter or notice"}
          </span>
          <span className="mt-1 text-xs text-[#667068]">
            You will review all suggested details before saving.
          </span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            disabled={working}
            onChange={(event) => void upload(event)}
          />
        </label>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[14px] bg-[#f7e4df] px-3 py-2.5 text-xs text-[#924a40]"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={manual}
          className="mt-4 min-h-12 w-full rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Enter details manually
        </button>
      </BillsCard>
      <CorrespondenceNotice />
    </BillsShell>
  );
}

function LetterDetail({ correspondenceId }: { correspondenceId: string }) {
  const { state, updateState } = useDiaryDockData();
  const original = state.correspondence.correspondence.find(
    (item) => item.id === correspondenceId,
  );
  const [draft, setDraft] = useState(original);
  const [responseNote, setResponseNote] = useState("");
  const [message, setMessage] = useState("");
  const [opening, setOpening] = useState(false);
  if (!draft)
    return (
      <BillsShell>
        <BillsHeader
          title="Letter Not Found"
          subtitle="This correspondence is not available in your private records."
          backHref="/office/correspondence"
        />
      </BillsShell>
    );
  const update = <K extends keyof CorrespondenceRecord>(
    key: K,
    value: CorrespondenceRecord[K],
  ) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const persist = (next: CorrespondenceRecord, success: string) => {
    setDraft(next);
    updateState((current) => ({
      ...current,
      correspondence: {
        correspondence: current.correspondence.correspondence.map((item) =>
          item.id === next.id ? next : item,
        ),
      },
    }));
    setMessage(success);
  };
  const save = () =>
    persist(
      {
        ...draft,
        reviewStatus: "reviewed",
        updatedAt: new Date().toISOString(),
      },
      "Letter details saved.",
    );
  const markComplete = () =>
    persist(
      {
        ...draft,
        status: "completed",
        actions: draft.actions.map((action) => ({
          ...action,
          completed: true,
        })),
        reviewStatus: "reviewed",
        updatedAt: new Date().toISOString(),
      },
      "Correspondence marked complete.",
    );
  const addResponse = () => {
    if (!responseNote.trim()) return;
    const now = new Date().toISOString();
    persist(
      {
        ...draft,
        responses: [
          {
            id: crypto.randomUUID(),
            note: responseNote.trim(),
            createdAt: now,
          },
          ...draft.responses,
        ],
        updatedAt: now,
      },
      "Follow-up note saved.",
    );
    setResponseNote("");
  };
  const createReminder = async () => {
    if (!draft.deadline) {
      setMessage("Add a deadline before creating a reminder.");
      return;
    }
    const id = `correspondence-${draft.id}-${draft.deadline}`;
    const reminder: Reminder = {
      id,
      title:
        draft.actions.find((action) => !action.completed)?.label ||
        `Respond to ${draft.sender || draft.title}`,
      note: `Linked to ${draft.title || "important correspondence"}. Check the original letter before acting.`,
      roomId: "office",
      roomName: "Office",
      group: "later",
      timeLabel: formatDate(draft.deadline),
      priority: "high",
      documentId: draft.documentId,
      documentTitle: draft.title,
      dueDate: draft.deadline,
    };
    updateState((current) => ({
      ...current,
      reminders: [
        reminder,
        ...current.reminders.filter((item) => item.id !== id),
      ],
      correspondence: {
        correspondence: current.correspondence.correspondence.map((item) =>
          item.id === draft.id
            ? {
                ...item,
                linkedReminderIds: Array.from(
                  new Set([...item.linkedReminderIds, id]),
                ),
              }
            : item,
        ),
      },
    }));
    await upsertStructuredReminder(reminder);
    setMessage("Deadline reminder added.");
  };
  const openDocument = async () => {
    setOpening(true);
    setMessage("");
    try {
      await openPrivateDocument(draft.storageBucket, draft.storagePath);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to open the original letter.",
      );
    } finally {
      setOpening(false);
    }
  };
  return (
    <BillsShell>
      <BillsHeader
        title={
          draft.reviewStatus === "needs-review"
            ? "Check Letter Details"
            : draft.title || "Letter Details"
        }
        subtitle={
          draft.reviewStatus === "needs-review"
            ? "Compare the suggested details with the original letter before confirming."
            : `${draft.sender || "Sender not recorded"} · ${draft.correspondenceType || "Correspondence"}`
        }
        backHref="/office/correspondence"
      />
      {draft.reviewStatus === "needs-review" ? (
        <p className="rounded-[18px] border border-[#d8c9ad] bg-[#f4ead7] px-4 py-3 text-[12px] leading-5 text-[#6f604a]">
          <strong>Please check the details.</strong> Document reading can make
          mistakes, especially with dates and required actions.
        </p>
      ) : null}
      <BillsCard>
        <BillsSectionTitle
          icon="mail"
          title="Letter information"
          detail="Only confirmed details are used for dashboards and reminders"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Title
            <input
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Sender
            <input
              value={draft.sender}
              onChange={(event) => update("sender", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Type
            <input
              value={draft.correspondenceType}
              onChange={(event) =>
                update("correspondenceType", event.target.value)
              }
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Folder
            <select
              value={draft.folder}
              onChange={(event) =>
                update("folder", event.target.value as CorrespondenceFolder)
              }
              className={fieldClass}
            >
              {correspondenceFolders.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Received
            <input
              type="date"
              value={draft.receivedDate}
              onChange={(event) => update("receivedDate", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Deadline
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) => update("deadline", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Status
            <select
              value={draft.status}
              onChange={(event) =>
                update("status", event.target.value as CorrespondenceStatus)
              }
              className={fieldClass}
            >
              <option value="unread">Unread</option>
              <option value="action-needed">Action needed</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block text-xs font-semibold text-[#667068]">
          Summary
          <textarea
            rows={4}
            value={draft.summary}
            onChange={(event) => update("summary", event.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={save}
            className="min-h-12 flex-1 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
          >
            {draft.reviewStatus === "needs-review"
              ? "Confirm and save"
              : "Save changes"}
          </button>
          {draft.storagePath ? (
            <button
              type="button"
              onClick={() => void openDocument()}
              disabled={opening}
              className="min-h-12 flex-1 rounded-[15px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
            >
              {opening ? "Opening…" : "View original letter"}
            </button>
          ) : null}
        </div>
        {message ? (
          <p
            role="status"
            className="mt-3 text-xs font-semibold text-[#52705a]"
          >
            {message}
          </p>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="check"
          title="Actions required"
          detail={
            draft.actions.length
              ? `${draft.actions.filter((action) => !action.completed).length} action${draft.actions.filter((action) => !action.completed).length === 1 ? "" : "s"} remaining`
              : "Add practical next steps from the letter"
          }
        />
        <div className="mt-4 space-y-2">
          {draft.actions.map((action) => (
            <label
              key={action.id}
              className="flex min-h-11 items-center gap-3 rounded-[14px] bg-[#f7f7f1] px-3 text-sm text-[#20352a]"
            >
              <input
                type="checkbox"
                checked={action.completed}
                onChange={(event) =>
                  update(
                    "actions",
                    draft.actions.map((item) =>
                      item.id === action.id
                        ? { ...item, completed: event.target.checked }
                        : item,
                    ),
                  )
                }
                className="h-4 w-4 accent-[#45604d]"
              />
              <span
                className={action.completed ? "line-through opacity-55" : ""}
              >
                {action.label}
              </span>
            </label>
          ))}
          <div className="flex gap-2">
            <input
              id="new-correspondence-action"
              className={fieldClass}
              placeholder="Add another action"
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById(
                  "new-correspondence-action",
                ) as HTMLInputElement | null;
                if (!input?.value.trim()) return;
                update("actions", [
                  ...draft.actions,
                  {
                    id: crypto.randomUUID(),
                    label: input.value.trim(),
                    completed: false,
                  },
                ]);
                input.value = "";
              }}
              className="mt-1.5 min-h-11 rounded-[14px] border border-[#6f8e72]/35 px-4 text-xs font-semibold text-[#45604d]"
            >
              Add
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createReminder()}
          className="mt-4 min-h-11 w-full rounded-[14px] border border-[#6f8e72]/35 text-sm font-semibold text-[#45604d]"
        >
          Create deadline reminder
        </button>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="phone"
          title="Contact and linked records"
          detail="Keep the relevant official contact and related DiaryDock records together"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Contact name
            <input
              value={draft.contactName}
              onChange={(event) => update("contactName", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Phone
            <input
              value={draft.contactPhone}
              onChange={(event) => update("contactPhone", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs font-semibold text-[#667068] sm:col-span-2">
            Official web address
            <input
              type="url"
              value={draft.contactUrl}
              onChange={(event) => update("contactUrl", event.target.value)}
              className={fieldClass}
              placeholder="https://…"
            />
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Linked bill
            <select
              value={draft.linkedBillId ?? ""}
              onChange={(event) =>
                update("linkedBillId", event.target.value || undefined)
              }
              className={fieldClass}
            >
              <option value="">None</option>
              {state.bills.bills
                .filter((bill) => bill.reviewStatus === "reviewed")
                .map((bill) => (
                  <option key={bill.id} value={bill.id}>
                    {bill.title || bill.provider}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Linked policy
            <select
              value={draft.linkedPolicyId ?? ""}
              onChange={(event) =>
                update("linkedPolicyId", event.target.value || undefined)
              }
              className={fieldClass}
            >
              <option value="">None</option>
              {state.insurance.policies
                .filter((policy) => policy.reviewStatus === "reviewed")
                .map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.title || policy.provider}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {safeWebUrl(draft.contactUrl) || draft.contactPhone ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {draft.contactPhone ? (
              <a
                href={`tel:${draft.contactPhone.replace(/[^+\d]/g, "")}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#eef2e9] px-4 text-xs font-semibold text-[#45604d]"
              >
                <UiIcon name="phone" className="h-4 w-4" />
                Call contact
              </a>
            ) : null}
            {safeWebUrl(draft.contactUrl) ? (
              <a
                href={safeWebUrl(draft.contactUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-[#eef2e9] px-4 text-xs font-semibold text-[#45604d]"
              >
                Open official website
              </a>
            ) : null}
          </div>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="file"
          title="Follow-up log"
          detail="Keep a dated record of calls, emails and responses"
        />
        <div className="mt-4 flex gap-2">
          <input
            value={responseNote}
            onChange={(event) => setResponseNote(event.target.value)}
            className={fieldClass}
            placeholder="Called provider, sent form…"
          />
          <button
            type="button"
            onClick={addResponse}
            className="mt-1.5 min-h-11 rounded-[14px] border border-[#6f8e72]/35 px-4 text-xs font-semibold text-[#45604d]"
          >
            Save
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.responses.map((response) => (
            <div
              key={response.id}
              className="rounded-[14px] bg-[#f7f7f1] px-3 py-3 text-xs"
            >
              <p className="text-[#20352a]">{response.note}</p>
              <p className="mt-1 text-[10px] text-[#667068]">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(response.createdAt))}
              </p>
            </div>
          ))}
        </div>
      </BillsCard>
      <div className="grid gap-3 sm:grid-cols-2">
        <BillsAction
          href={`/office/correspondence/${draft.id}/summary`}
          icon="leaf"
          title="Summary & actions"
          detail="Review the meaning, deadline and checklist"
        />
        <button
          type="button"
          onClick={markComplete}
          className="min-h-[80px] rounded-[18px] border border-[#6f8e72]/25 bg-white px-4 text-sm font-semibold text-[#45604d]"
        >
          Mark correspondence complete
        </button>
      </div>
      <CorrespondenceNotice />
    </BillsShell>
  );
}

function Summary({ correspondenceId }: { correspondenceId: string }) {
  const { state, updateState } = useDiaryDockData();
  const item = state.correspondence.correspondence.find(
    (entry) => entry.id === correspondenceId,
  );
  const [message, setMessage] = useState("");
  if (!item)
    return (
      <BillsShell>
        <BillsHeader
          title="Letter Not Found"
          subtitle="This correspondence is not available."
          backHref="/office/correspondence"
        />
      </BillsShell>
    );
  const updateActions = (actionId: string, completed: boolean) =>
    updateState((current) => ({
      ...current,
      correspondence: {
        correspondence: current.correspondence.correspondence.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                actions: entry.actions.map((action) =>
                  action.id === actionId ? { ...action, completed } : action,
                ),
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      },
    }));
  const linkedReminders = state.reminders.filter((reminder) =>
    item.linkedReminderIds.includes(reminder.id),
  );
  const markComplete = () => {
    updateState((current) => ({
      ...current,
      correspondence: {
        correspondence: current.correspondence.correspondence.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "completed",
                actions: entry.actions.map((action) => ({
                  ...action,
                  completed: true,
                })),
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      },
    }));
    setMessage("Correspondence marked complete.");
  };
  return (
    <BillsShell>
      <BillsHeader
        title="Summary & Actions"
        subtitle="A helpful overview of the details you recorded. Always refer back to the original letter."
        backHref={`/office/correspondence/${item.id}`}
      />
      <BillsCard>
        <BillsSectionTitle
          icon="leaf"
          title="What this letter means"
          detail={item.sender || "Sender not recorded"}
        />
        <p className="mt-4 rounded-[16px] bg-[#f7f7f1] px-4 py-4 text-sm leading-6 text-[#20352a]">
          {item.summary || "No summary has been recorded yet."}
        </p>
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Deadline"
          detail={
            item.deadline
              ? `${formatDate(item.deadline)} · ${Math.max(0, daysUntil(item.deadline))} days remaining`
              : "No deadline recorded"
          }
        />
        {item.deadline ? (
          <div
            className={`mt-4 rounded-[16px] px-4 py-3 text-sm font-semibold ${isDueSoon(item) ? "bg-[#f9e7e2] text-[#924a40]" : "bg-[#eef2e9] text-[#45604d]"}`}
          >
            {formatDate(item.deadline)}
          </div>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="check"
          title="What you need to do"
          detail={`${item.actions.filter((action) => !action.completed).length} action${item.actions.filter((action) => !action.completed).length === 1 ? "" : "s"} remaining`}
        />
        <div className="mt-4 space-y-2">
          {item.actions.length ? (
            item.actions.map((action) => (
              <label
                key={action.id}
                className="flex min-h-11 items-center gap-3 rounded-[14px] bg-[#f7f7f1] px-3 text-sm text-[#20352a]"
              >
                <input
                  type="checkbox"
                  checked={action.completed}
                  onChange={(event) =>
                    updateActions(action.id, event.target.checked)
                  }
                  className="h-4 w-4 accent-[#45604d]"
                />
                <span
                  className={action.completed ? "line-through opacity-55" : ""}
                >
                  {action.label}
                </span>
              </label>
            ))
          ) : (
            <p className="rounded-[14px] bg-[#f7f7f1] px-3 py-4 text-center text-xs text-[#667068]">
              No actions have been recorded.
            </p>
          )}
        </div>
      </BillsCard>
      {item.contactName || item.contactPhone || safeWebUrl(item.contactUrl) ? (
        <BillsCard>
          <BillsSectionTitle
            icon="phone"
            title="Contact details"
            detail={item.contactName}
          />
          <div className="mt-4 space-y-2 text-sm text-[#20352a]">
            {item.contactPhone ? <p>{item.contactPhone}</p> : null}
            {safeWebUrl(item.contactUrl) ? (
              <a
                href={safeWebUrl(item.contactUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-xs font-semibold text-[#45604d]"
              >
                Open official website
              </a>
            ) : null}
          </div>
        </BillsCard>
      ) : null}
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Linked reminders"
          detail={
            linkedReminders.length
              ? `${linkedReminders.length} reminder${linkedReminders.length === 1 ? "" : "s"}`
              : "No reminders linked yet"
          }
        />
        <div className="mt-4 space-y-2">
          {linkedReminders.map((reminder) => (
            <Link
              key={reminder.id}
              href="/reminders"
              className="flex min-h-12 items-center justify-between rounded-[14px] bg-[#f7f7f1] px-3 text-xs"
            >
              <span className="font-semibold text-[#20352a]">
                {reminder.title}
              </span>
              <span className="text-[#667068]">{reminder.timeLabel}</span>
            </Link>
          ))}
        </div>
      </BillsCard>
      <button
        type="button"
        onClick={markComplete}
        className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        Mark as complete
      </button>
      {message ? (
        <p
          role="status"
          className="text-center text-xs font-semibold text-[#52705a]"
        >
          {message}
        </p>
      ) : null}
      <CorrespondenceNotice />
    </BillsShell>
  );
}

export function CorrespondenceWorkspace({
  view,
  correspondenceId,
}: {
  view: CorrespondenceView;
  correspondenceId?: string;
}) {
  if (view === "folders") return <Folders />;
  if (view === "new") return <NewCorrespondence />;
  if (view === "detail" && correspondenceId)
    return <LetterDetail correspondenceId={correspondenceId} />;
  if (view === "summary" && correspondenceId)
    return <Summary correspondenceId={correspondenceId} />;
  return <Dashboard />;
}
