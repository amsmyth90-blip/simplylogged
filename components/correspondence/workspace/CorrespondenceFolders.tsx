"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  BillsCard,
  BillsHeader,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { correspondenceFolders } from "@/lib/correspondence-records";
import { dateTime } from "@/lib/presentation";

import {
  CorrespondenceNotice,
  CorrespondenceRow,
} from "./correspondence-shared";

export function CorrespondenceFolders() {
  const { state } = useDiaryDockData();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("All folders");
  const [status, setStatus] = useState(() =>
    searchParams.get("status") === "action-needed" ? "action-needed" : "All",
  );
  const [unreadOnly, setUnreadOnly] = useState(false);
  const allItems = state.correspondence.correspondence;
  const items = allItems
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
        count: allItems.filter((item) => item.folder === name).length,
      })),
    [allItems],
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
