"use client";

import Link from "next/link";

import {
  BillsAction,
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { dateTime } from "@/lib/presentation";

import {
  CorrespondenceNotice,
  CorrespondenceRow,
  isCorrespondenceDueSoon,
} from "./correspondence-shared";

export function CorrespondenceDashboard() {
  const { state, hydrated } = useDiaryDockData();
  const items = state.correspondence.correspondence;
  const confirmed = items.filter((item) => item.reviewStatus === "reviewed");
  const unread = confirmed.filter((item) => item.status === "unread");
  const actions = confirmed.filter((item) => item.status === "action-needed");
  const dueSoon = confirmed.filter(isCorrespondenceDueSoon);
  const completed = confirmed.filter((item) => item.status === "completed");
  const recent = [...items]
    .sort((a, b) => dateTime(b.receivedDate) - dateTime(a.receivedDate))
    .slice(0, 5);

  if (!hydrated) {
    return (
      <BillsShell>
        <BillsCard>
          <p className="text-sm text-[#667068]">Opening your correspondence…</p>
        </BillsCard>
      </BillsShell>
    );
  }

  const stats = [
    {
      icon: "mail" as const,
      count: unread.length,
      label: "Unread",
      tone: "bg-[#f7f7f1]",
      color: "text-[#52705a]",
    },
    {
      icon: "alert" as const,
      count: actions.length,
      label: "Awaiting action",
      tone: "bg-[#fbf0da]",
      color: "text-[#93641e]",
    },
    {
      icon: "calendar" as const,
      count: dueSoon.length,
      label: "Due soon",
      tone: "bg-[#f9e7e2]",
      color: "text-[#9a4f43]",
    },
    {
      icon: "check" as const,
      count: completed.length,
      label: "Completed",
      tone: "bg-[#e7efe3]",
      color: "text-[#49644d]",
    },
  ];

  return (
    <BillsShell>
      <BillsHeader
        title="Important Correspondence"
        subtitle="Keep track of important letters, notices and messages that need your attention."
      />
      <BillsCard>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-[16px] p-3 ${stat.tone}`}>
              <UiIcon name={stat.icon} className={`h-4 w-4 ${stat.color}`} />
              <p className="mt-2 text-2xl font-semibold text-[#20352a]">
                {stat.count}
              </p>
              <p className="text-[11px] text-[#667068]">{stat.label}</p>
            </div>
          ))}
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
