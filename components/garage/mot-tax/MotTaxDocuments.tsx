import Link from "next/link";

import { BillsCard } from "@/components/bills/BillsUi";
import { UiIcon } from "@/components/UiIcon";

import { useMotTax } from "./MotTaxContext";
import { MotTaxEmpty, MotTaxSectionTitle } from "./MotTaxUi";

export function MotTaxDocuments() {
  const motTax = useMotTax();
  if (!motTax.vehicle) return null;
  return (
    <BillsCard>
      <MotTaxSectionTitle
        title="MOT & tax documents"
        detail="Original files stay in All Files and are linked here"
        action={
          <Link
            href="/capture?room=garage"
            className="inline-flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-[#45604d]"
          >
            <UiIcon name="plus" className="h-4 w-4" />
            Add
          </Link>
        }
      />
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-[14px] bg-[#f0f2e9] p-1">
        {(["All", "MOT", "Tax"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => motTax.setDocumentFilter(filter)}
            className={`min-h-11 rounded-[11px] text-[10px] font-semibold ${motTax.documentFilter === filter ? "bg-white text-[#315d45] shadow-sm" : "text-[#667068]"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {motTax.filteredDocuments.length ? (
          motTax.filteredDocuments.map((document) => (
            <Link
              key={document.id}
              href={`/document/${document.id}?from=vehicle&vehicleId=${motTax.vehicle?.id}`}
              className="flex min-h-[72px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.07] bg-[#faf9f4] px-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#52705a]">
                <UiIcon name="file" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#20352a]">
                  {document.title}
                </span>
                <span className="text-[10px] text-[#667068]">
                  {document.kind} · {document.updated}
                </span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
            </Link>
          ))
        ) : (
          <MotTaxEmpty
            title="No matching documents"
            detail="Scan or link an MOT certificate or road-tax receipt when you have one."
          />
        )}
      </div>
    </BillsCard>
  );
}
