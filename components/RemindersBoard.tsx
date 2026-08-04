"use client";

import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { UiIcon } from "@/components/UiIcon";
import type { Reminder, ReminderGroup } from "@/lib/mock-data";

type Filter = "all" | "today" | "upcoming" | "done";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "done", label: "Done" }
];

const groupTitles: Record<ReminderGroup, string> = {
  today: "Today",
  week: "This week",
  later: "Later",
  done: "Completed"
};

const groupOrder: ReminderGroup[] = ["today", "week", "later", "done"];

const priorityDot: Record<Reminder["priority"], string> = {
  high: "bg-orange-500",
  normal: "bg-sky-400",
  low: "bg-slate-300"
};

type RemindersBoardProps = {
  reminders: Reminder[];
  onOpenReminder?: (reminder: Reminder) => void;
  onToggleDone?: (reminder: Reminder) => void;
  onSnooze?: (reminder: Reminder) => void;
};

export function RemindersBoard({ reminders, onOpenReminder, onToggleDone, onSnooze }: RemindersBoardProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const isDone = (item: Reminder) => item.group === "done";

  const matchesFilter = (item: Reminder) => {
    if (filter === "all") return !isDone(item);
    if (filter === "today") return item.group === "today" && !isDone(item);
    if (filter === "upcoming") return (item.group === "week" || item.group === "later") && !isDone(item);
    return isDone(item);
  };

  const visible = reminders.filter(matchesFilter);
  const dueToday = reminders.filter((item) => item.group === "today" && !isDone(item)).length;
  const thisWeek = reminders.filter((item) => item.group === "week" && !isDone(item)).length;
  const doneCount = reminders.filter((item) => item.group === "done").length;

  const visibleGroups = groupOrder
    .map((group) => ({
      group,
      items: visible.filter((item) => (filter === "done" ? isDone(item) : item.group === group))
    }))
    .filter((entry) => entry.items.length > 0);

  const groupsToRender =
    filter === "done"
      ? [{ group: "done" as ReminderGroup, items: visible }]
      : visibleGroups.filter((entry) => entry.group !== "done");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Due today", value: dueToday, tone: "text-orange-600" },
          { label: "This week", value: thisWeek, tone: "text-sky-700" },
          { label: "Completed", value: doneCount, tone: "text-moss" }
        ].map((stat) => (
          <div key={stat.label} className="glass-card px-4 py-3.5 text-center">
            <p className={`text-2xl font-semibold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink/45">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-pill flex p-1">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition ${
              filter === item.id ? "bg-ink text-white shadow-soft" : "text-ink/55 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {groupsToRender.length === 0 ? (
        <EmptyState
          icon="check"
          title={filter === "done" ? "Nothing completed yet" : "All clear"}
          message={
            filter === "done"
              ? "Reminders you tick off will gather here."
              : "No reminders in this view - enjoy the quiet."
          }
        />
      ) : (
        groupsToRender.map(({ group, items }) => (
          <section key={group} className="space-y-2.5">
            <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.18em] text-ink/40">
              {groupTitles[group]}
            </h2>
            {items.map((item) => {
              const done = isDone(item);

              return (
                <article
                  key={item.id}
                  className={`glass-card flex items-start gap-3.5 p-4 transition ${done ? "opacity-60" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleDone?.(item)}
                    aria-label={done ? `Reopen ${item.title}` : `Complete ${item.title}`}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      done ? "border-moss bg-moss text-white" : "border-slate-300 bg-white text-transparent hover:border-moss"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="m5.5 12.5 4 4 9-9.5" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => onOpenReminder?.(item)} className="w-full text-left">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[item.priority]}`} />
                      <p className={`truncate text-sm font-semibold ${done ? "text-ink/45 line-through" : "text-ink"}`}>
                        {item.title}
                      </p>
                    </div>
                    {item.note && !done ? (
                      <p className="mt-1 text-[13px] leading-5 text-ink/55">{item.note}</p>
                    ) : null}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/50">
                        <UiIcon name="clock" className="h-3.5 w-3.5" />
                        {item.timeLabel}
                      </span>
                      {item.repeat ? (
                        <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          {item.repeat}
                        </span>
                      ) : null}
                      {item.assignedTo ? (
                        <span className="rounded-full bg-[#edf4e9] px-2 py-0.5 text-[11px] font-semibold text-[#5d7653]">
                          For {item.assignedTo}
                        </span>
                      ) : null}
                      {item.roomId && item.roomName ? (
                        <Link
                          href={`/room/${item.roomId}`}
                          className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-ink/55 transition hover:text-ink"
                        >
                          {item.roomName}
                        </Link>
                      ) : null}
                      {item.documentId && item.documentTitle ? (
                        <Link
                          href={`/document/${item.documentId}`}
                          className="rounded-full bg-sage/60 px-2 py-0.5 text-[11px] font-semibold text-moss transition hover:text-ink"
                        >
                          {item.documentTitle}
                        </Link>
                      ) : null}
                    </div>
                    {!done ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSnooze?.(item);
                          }}
                          className="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ink/55 transition hover:bg-white hover:text-ink"
                        >
                          Snooze 7 days
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
