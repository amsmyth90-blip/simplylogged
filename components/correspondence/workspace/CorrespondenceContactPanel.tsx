"use client";

import {
  BillsCard,
  BillsSectionTitle,
  fieldClass,
} from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { safeWebUrl } from "./correspondence-shared";
import type { CorrespondenceDetailController } from "./useCorrespondenceDetail";

export function CorrespondenceContactPanel({
  controller,
}: {
  controller: CorrespondenceDetailController;
}) {
  const { state, draft, update } = controller;
  if (!draft) return null;
  const officialUrl = safeWebUrl(draft.contactUrl);
  return (
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
      {officialUrl || draft.contactPhone ? (
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
          {officialUrl ? (
            <a
              href={officialUrl}
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
  );
}
