import {
  BillsHeader,
  BillsNotice,
  BillsShell,
} from "@/components/bills/BillsUi";
import { BillDatesCard } from "@/components/bills/workspace/BillDatesCard";
import { BillDetailsCard } from "@/components/bills/workspace/BillDetailsCard";
import { useBillDetail } from "@/components/bills/workspace/useBillDetail";
import { formatMoney } from "@/lib/bill-records";

export function BillDetailWorkspace({ billId }: { billId: string }) {
  const model = useBillDetail(billId);
  const { bill, draft } = model;
  if (!bill || !draft) {
    return (
      <BillsShell>
        <BillsHeader
          title="Bill not found"
          subtitle="This bill may have been removed or is not available in this account."
          backHref="/office/bills"
        />
      </BillsShell>
    );
  }

  return (
    <BillsShell>
      <BillsHeader
        title={
          draft.reviewStatus === "needs-review"
            ? "Check bill details"
            : draft.title
        }
        subtitle={
          draft.reviewStatus === "needs-review"
            ? "Compare these details with the original bill, correct anything needed, then confirm."
            : `${draft.provider || "Household bill"} · ${formatMoney(draft.amount)}`
        }
        backHref="/office/bills"
      />
      {draft.reviewStatus === "needs-review" ? (
        <p className="rounded-[18px] border border-[#d8c9ad] bg-[#f4ead7] px-4 py-3 text-[12px] leading-5 text-[#6f604a]">
          <strong>Check before saving.</strong> DiaryDock’s document read is a
          helpful starting point and may contain mistakes.
        </p>
      ) : null}
      <BillDetailsCard {...model} draft={draft} />
      <BillDatesCard {...model} draft={draft} />
      <BillsNotice />
    </BillsShell>
  );
}
