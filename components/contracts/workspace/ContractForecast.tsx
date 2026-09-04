"use client";

import { useMemo } from "react";
import {
  BillsCard,
  BillsHeader,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { contractAnnualCost, contractCategories } from "@/lib/contract-records";
import { ContractNotice, formatContractMoney } from "./contracts-shared";

export function ContractForecast() {
  const { state } = useDiaryDockData();
  const active = state.contracts.contracts.filter(
    (contract) =>
      contract.reviewStatus === "reviewed" && contract.status === "active",
  );
  const byCategory = useMemo(
    () =>
      contractCategories
        .map((category) => ({
          category,
          total: active
            .filter((contract) => contract.category === category)
            .reduce((sum, contract) => sum + contractAnnualCost(contract), 0),
        }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total),
    [active],
  );
  const total = byCategory.reduce((sum, item) => sum + item.total, 0);
  return (
    <BillsShell>
      <BillsHeader
        title="Commitment Forecast"
        subtitle="A simple 12-month view based on the contract prices you have confirmed."
        backHref="/office/contracts"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="chart"
          title="Next 12 months"
          detail={`${active.length} active confirmed contract${active.length === 1 ? "" : "s"}`}
        />
        <p className="mt-5 text-3xl font-semibold text-[#20352a]">
          {formatContractMoney(total)}
        </p>
        <p className="mt-1 text-xs text-[#667068]">
          Estimated recurring commitment, not a bank balance or guaranteed
          forecast.
        </p>
        <div className="mt-6 space-y-4">
          {byCategory.map((item) => (
            <div key={item.category}>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#20352a]">
                  {item.category}
                </span>
                <span className="text-[#667068]">
                  {formatContractMoney(item.total)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef2e9]">
                <div
                  className="h-full rounded-full bg-[#6f8e72]"
                  style={{
                    width: `${total ? Math.max(4, (item.total / total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {!byCategory.length ? (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-7 text-center text-sm text-[#667068]">
              Confirm an active recurring contract to see its forecast here.
            </p>
          ) : null}
        </div>
      </BillsCard>
      <ContractNotice />
    </BillsShell>
  );
}
