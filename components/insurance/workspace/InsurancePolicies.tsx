"use client";
import Link from "next/link";
import { useState } from "react";
import {
  BillsCard,
  BillsHeader,
  BillsShell,
  fieldClass,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { officeInsuranceTypes } from "@/lib/insurance-records";
import { insuranceDaysUntil, PolicyRow } from "./insurance-shared";

export function InsurancePolicies() {
  const { state } = useDiaryDockData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const policies = state.insurance.policies
    .filter((policy) => policy.reviewStatus === "reviewed")
    .filter((policy) => type === "All" || policy.type === type)
    .filter(
      (policy) => status === "All" || policy.status === status.toLowerCase(),
    )
    .filter((policy) =>
      `${policy.title} ${policy.provider} ${policy.type} ${policy.policyNumberMasked}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        insuranceDaysUntil(a.renewalDate) - insuranceDaysUntil(b.renewalDate),
    );
  return (
    <BillsShell>
      <BillsHeader
        title="My Policies"
        subtitle="Search and filter your confirmed home and personal protection policies."
        backHref="/office/insurance"
      />
      <BillsCard>
        <label className="text-xs font-semibold text-[#667068]">
          Search policies
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass}
            placeholder="Provider, title or policy number"
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#667068]">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              {officeInsuranceTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#667068]">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={fieldClass}
            >
              <option>All</option>
              <option>Active</option>
              <option>Expired</option>
              <option>Cancelled</option>
            </select>
          </label>
        </div>
      </BillsCard>
      <div className="space-y-3">
        {policies.length ? (
          policies.map((policy) => (
            <PolicyRow key={policy.id} policy={policy} />
          ))
        ) : (
          <BillsCard>
            <p className="text-center text-sm text-[#667068]">
              No policies match this view.
            </p>
          </BillsCard>
        )}
      </div>
      <Link
        href="/office/insurance/new"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add or upload policy
      </Link>
    </BillsShell>
  );
}
