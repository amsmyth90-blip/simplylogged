"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { quickDials, roomDetails, type AreaIcon } from "@/lib/mock-data";

type SearchResult = {
  id: string;
  title: string;
  detail: string;
  href: string;
  icon: IconName;
  tone: string;
  haystack: string;
  badge?: string;
};

type SearchSection = {
  id: string;
  title: string;
  hint: string;
  results: SearchResult[];
};

const commonSearches = ["passport", "insurance", "MOT", "will", "GP", "emergency", "school", "pet"];

function buildHaystack(parts: Array<string | string[] | undefined>) {
  return parts.flatMap((part) => (Array.isArray(part) ? part : [part])).filter(Boolean).join(" ").toLowerCase();
}

function matchesQuery(result: SearchResult, query: string) {
  const normalized = query.trim().toLowerCase();
  return normalized.length === 0 || result.haystack.includes(normalized);
}

export function SearchWorkspace() {
  const { state } = useDiaryDockData();
  const [query, setQuery] = useState("");

  const sections = useMemo<SearchSection[]>(() => {
    const documentResults: SearchResult[] = state.vaultDocuments.map((document) => ({
      id: `document-${document.id}`,
      title: document.title,
      detail: [
        document.category,
        document.roomName,
        document.issuer,
        document.reviewStatus === "needs-review" ? "Needs review" : undefined
      ]
        .filter(Boolean)
        .join(" - "),
      href: `/document/${document.id}`,
      icon: "file",
      tone: document.reviewStatus === "needs-review" ? "bg-amber-100 text-amber-700" : "bg-mist text-sky-700",
      badge: document.reviewStatus === "needs-review" ? "Review" : document.kind,
      haystack: buildHaystack([
        document.title,
        document.category,
        document.kind,
        document.roomName,
        document.issuer,
        document.dueDate,
        document.extractionSummary,
        document.extractedText,
        document.actionItems,
        document.originalFileName
      ])
    }));

    const roomResults: SearchResult[] = Object.values(roomDetails).map((room) => ({
      id: `room-${room.id}`,
      title: room.name,
      detail: `${room.domain} - ${room.stats.documents} documents`,
      href: `/room/${room.id}`,
      icon: room.icon as AreaIcon,
      tone: "bg-sage/60 text-moss",
      badge: room.status === "attention" ? "Needs care" : room.status === "secure" ? "Secure" : "Ready",
      haystack: buildHaystack([
        room.name,
        room.domain,
        room.headline,
        room.description,
        room.belongsHere,
        room.tasks.map((task) => task.label),
        room.documents.map((document) => document.title)
      ])
    }));

    const reminderResults: SearchResult[] = state.reminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      title: reminder.title,
      detail: [reminder.timeLabel, reminder.roomName, reminder.documentTitle, reminder.note].filter(Boolean).join(" - "),
      href: "/reminders",
      icon: "calendar",
      tone: reminder.priority === "high" ? "bg-blush text-orange-700" : "bg-mist text-sky-700",
      badge: reminder.priority,
      haystack: buildHaystack([reminder.title, reminder.note, reminder.roomName, reminder.timeLabel, reminder.repeat, reminder.documentTitle])
    }));

    const mailboxResults: SearchResult[] = state.mailboxItems.map((item) => ({
      id: `mailbox-${item.id}`,
      title: item.title,
      detail: [item.source, item.kind, item.suggestedRoom].filter(Boolean).join(" - "),
      href: "/room/mailbox",
      icon: "mail",
      tone: item.routeStatus === "new" ? "bg-amber-100 text-amber-700" : "bg-mist text-sky-700",
      badge: item.routeStatus === "new" ? "New" : "Filed",
      haystack: buildHaystack([item.title, item.source, item.kind, item.suggestedRoom, item.routeStatus])
    }));

    const emergencyResults: SearchResult[] = [
      ...state.emergencyContacts.map((contact) => ({
        id: `emergency-contact-${contact.id}`,
        title: contact.name,
        detail: [contact.relation, contact.phone, contact.note].filter(Boolean).join(" - "),
        href: "/emergency",
        icon: "phone" as IconName,
        tone: "bg-red-50 text-red-600",
        badge: "Contact",
        haystack: buildHaystack([contact.name, contact.relation, contact.phone, contact.note])
      })),
      ...state.emergencyPlans.map((plan) => ({
        id: `emergency-plan-${plan.id}`,
        title: plan.title,
        detail: plan.summary,
        href: "/emergency",
        icon: "alert" as IconName,
        tone: "bg-blush text-orange-700",
        badge: "Plan",
        haystack: buildHaystack([plan.title, plan.summary, plan.steps])
      })),
      ...state.homeInfo.map((info) => ({
        id: `home-info-${info.label}`,
        title: info.label,
        detail: info.value,
        href: "/emergency",
        icon: "home" as IconName,
        tone: "bg-sage/60 text-moss",
        badge: "Home",
        haystack: buildHaystack([info.label, info.value])
      })),
      ...quickDials.map((dial) => ({
        id: `quick-dial-${dial.id}`,
        title: dial.label,
        detail: `${dial.sub} - ${dial.number}`,
        href: "/emergency",
        icon: "phone" as IconName,
        tone: dial.tone === "danger" ? "bg-red-500 text-white" : "bg-mist text-sky-700",
        badge: "Dial",
        haystack: buildHaystack([dial.label, dial.sub, dial.number])
      }))
    ];

    return [
      { id: "documents", title: "Documents", hint: "All Files, OCR text, issuers, rooms", results: documentResults },
      { id: "rooms", title: "Rooms", hint: "Estate rooms and what belongs there", results: roomResults },
      { id: "reminders", title: "Reminders", hint: "Tasks, renewals, dates, repeats", results: reminderResults },
      { id: "mailbox", title: "Mailbox", hint: "Incoming and routed paperwork", results: mailboxResults },
      { id: "emergency", title: "Emergency", hint: "Contacts, plans, home notes, quick dials", results: emergencyResults }
    ];
  }, [state]);

  const filteredSections = sections
    .map((section) => ({
      ...section,
      results: section.results.filter((result) => matchesQuery(result, query))
    }))
    .filter((section) => section.results.length > 0);

  const resultCount = filteredSections.reduce((total, section) => total + section.results.length, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Search"
        title="Find anything"
        subtitle="Search across the estate, Vault, OCR text, reminders, mailbox, and emergency plans."
        backHref="/dashboard"
        backLabel="Home"
        meta={
          <>
            <span className="estate-chip">{state.vaultDocuments.length} documents</span>
            <span className="estate-chip">{state.reminders.length} reminders</span>
            <span className="estate-chip">{Object.keys(roomDetails).length} rooms</span>
          </>
        }
      />

      <section className="estate-sheet sticky top-3 z-20 p-3">
        <label className="flex items-center gap-3 rounded-[22px] bg-white/80 px-4 py-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]">
          <UiIcon name="search" className="h-5 w-5 shrink-0 text-ink/35" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search passport, insurance, MOT..."
            className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink/38"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink/55"
            >
              Clear
            </button>
          ) : null}
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {commonSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setQuery(term)}
              className="shrink-0 rounded-full border border-white/70 bg-white/62 px-3 py-1.5 text-xs font-semibold text-ink/55"
            >
              {term}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-ink">
          {query.trim() ? `${resultCount} result${resultCount === 1 ? "" : "s"}` : "Everything searchable"}
        </p>
        <p className="text-xs text-ink/45">Private to your DiaryDock</p>
      </div>

      {filteredSections.length ? (
        <div className="space-y-5">
          {filteredSections.map((section) => (
            <section key={section.id} className="space-y-3">
              <SectionHeader title={section.title} hint={section.hint} />
              <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
                {section.results.slice(0, query.trim() ? 12 : 5).map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/55"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${result.tone}`}>
                      <UiIcon name={result.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{result.title}</span>
                        {result.badge ? (
                          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold capitalize text-ink/52">
                            {result.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink/50">{result.detail}</span>
                    </span>
                    <UiIcon name="chevron-right" className="h-4 w-4 shrink-0 text-ink/25" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title="No results yet"
          message="Try a document name, room, issuer, date, reminder, or phrase from scanned OCR text."
        />
      )}
    </div>
  );
}
