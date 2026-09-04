"use client";

import Link from "next/link";
import { useState } from "react";

import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { daysUntil, formatDate } from "@/lib/presentation";

import {
  CorrespondenceNotice,
  isCorrespondenceDueSoon,
  safeWebUrl,
} from "./correspondence-shared";

export function CorrespondenceSummary({
  correspondenceId,
}: {
  correspondenceId: string;
}) {
  const { state, updateState } = useDiaryDockData();
  const item = state.correspondence.correspondence.find(
    (entry) => entry.id === correspondenceId,
  );
  const [message, setMessage] = useState("");
  if (!item) {
    return (
      <BillsShell>
        <BillsHeader
          title="Letter Not Found"
          subtitle="This correspondence is not available."
          backHref="/office/correspondence"
        />
      </BillsShell>
    );
  }
  const updateActions = (actionId: string, completed: boolean) => {
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
  };
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
  const remaining = item.actions.filter((action) => !action.completed).length;
  const officialUrl = safeWebUrl(item.contactUrl);

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
            className={`mt-4 rounded-[16px] px-4 py-3 text-sm font-semibold ${isCorrespondenceDueSoon(item) ? "bg-[#f9e7e2] text-[#924a40]" : "bg-[#eef2e9] text-[#45604d]"}`}
          >
            {formatDate(item.deadline)}
          </div>
        ) : null}
      </BillsCard>
      <BillsCard>
        <BillsSectionTitle
          icon="check"
          title="What you need to do"
          detail={`${remaining} action${remaining === 1 ? "" : "s"} remaining`}
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
      {item.contactName || item.contactPhone || officialUrl ? (
        <BillsCard>
          <BillsSectionTitle
            icon="phone"
            title="Contact details"
            detail={item.contactName}
          />
          <div className="mt-4 space-y-2 text-sm text-[#20352a]">
            {item.contactPhone ? <p>{item.contactPhone}</p> : null}
            {officialUrl ? (
              <a
                href={officialUrl}
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
