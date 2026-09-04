"use client";

import {
  BillsCalendar,
  BillsInbox,
} from "@/components/bills/workspace/BillCollections";
import { BillDetailWorkspace } from "@/components/bills/workspace/BillDetailWorkspace";
import { BillsDashboard } from "@/components/bills/workspace/BillsDashboard";
import { BillsInsights } from "@/components/bills/workspace/BillsInsights";
import { BillsList } from "@/components/bills/workspace/BillsList";
import { NewBill } from "@/components/bills/workspace/NewBill";

type BillsView =
  | "all"
  | "calendar"
  | "dashboard"
  | "detail"
  | "inbox"
  | "insights"
  | "new";

export function BillsWorkspace({
  view,
  billId,
}: {
  view: BillsView;
  billId?: string;
}) {
  if (view === "all") return <BillsList />;
  if (view === "new") return <NewBill />;
  if (view === "calendar") return <BillsCalendar />;
  if (view === "insights") return <BillsInsights />;
  if (view === "inbox") return <BillsInbox />;
  if (view === "detail" && billId)
    return <BillDetailWorkspace billId={billId} />;
  return <BillsDashboard />;
}
