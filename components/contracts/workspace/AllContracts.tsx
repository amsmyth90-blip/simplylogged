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
import { contractCategories } from "@/lib/contract-records";
import { dateTime } from "@/lib/presentation";
import { ContractNotice, ContractRow } from "./contracts-shared";

export function AllContracts() {
  const { state } = useDiaryDockData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const contracts = state.contracts.contracts
    .filter(
      (contract) =>
        status === "All" || contract.status === status.toLowerCase(),
    )
    .filter((contract) => category === "All" || contract.category === category)
    .filter((contract) =>
      `${contract.serviceName} ${contract.provider} ${contract.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => dateTime(a.renewalDate) - dateTime(b.renewalDate));
  return (
    <BillsShell>
      <BillsHeader
        title="My Contracts"
        subtitle="Search and filter household and personal contracts in one place."
        backHref="/office/contracts"
      />
      <BillsCard>
        <label className="text-xs font-semibold text-[#667068]">
          Search contracts
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClass}
            placeholder="Service, provider or category"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {["All", "Active", "Draft", "Cancelled", "Expired"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold ${status === item ? "bg-[#355540] text-white" : "bg-[#f0f2e9] text-[#52705a]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-semibold text-[#667068]">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={fieldClass}
          >
            <option>All</option>
            {contractCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </BillsCard>
      <div className="space-y-3">
        {contracts.length ? (
          contracts.map((contract) => (
            <ContractRow key={contract.id} contract={contract} />
          ))
        ) : (
          <BillsCard>
            <p className="text-center text-sm text-[#667068]">
              No contracts match this view.
            </p>
          </BillsCard>
        )}
      </div>
      <Link
        href="/office/contracts/new"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
      >
        <UiIcon name="plus" className="h-4 w-4" />
        Add or upload a contract
      </Link>
      <ContractNotice />
    </BillsShell>
  );
}
