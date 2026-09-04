import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  BillsCard,
  BillsHeader,
  BillsNotice,
  BillsSectionTitle,
  BillsShell,
} from "@/components/bills/BillsUi";
import { BillRow } from "@/components/bills/workspace/bill-shared";
import { effectiveBillStatus } from "@/lib/bill-records";
import { dateTime } from "@/lib/presentation";

export function BillsCalendar() {
  const { state } = useDiaryDockData();
  const bills = state.bills.bills
    .filter(
      (bill) =>
        bill.reviewStatus === "reviewed" &&
        bill.dueDate &&
        !["paid", "cancelled"].includes(effectiveBillStatus(bill)),
    )
    .sort((a, b) => dateTime(a.dueDate) - dateTime(b.dueDate));
  return (
    <BillsShell>
      <BillsHeader
        title="Bill Calendar"
        subtitle="Upcoming payment dates from bills you have reviewed."
        backHref="/office/bills"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="calendar"
          title="Upcoming dates"
          detail={
            bills.length
              ? `${bills.length} payment date${bills.length === 1 ? "" : "s"} recorded`
              : "No upcoming dates yet"
          }
        />
        <div className="mt-4 space-y-3">
          {bills.length ? (
            bills.map((bill) => <BillRow key={bill.id} bill={bill} />)
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-sm text-[#667068]">
              Add and confirm a bill with a due date to see it here.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsNotice />
    </BillsShell>
  );
}

export function BillsInbox() {
  const { state } = useDiaryDockData();
  const bills = state.bills.bills.filter(
    (bill) => bill.reviewStatus === "needs-review",
  );
  return (
    <BillsShell>
      <BillsHeader
        title="Document Inbox"
        subtitle="Bills stay here until you compare the extracted details with the original."
        backHref="/office/bills"
      />
      <BillsCard>
        <BillsSectionTitle
          icon="mail"
          title="Waiting for review"
          detail={`${bills.length} bill${bills.length === 1 ? "" : "s"} to check`}
        />
        <div className="mt-4 space-y-3">
          {bills.length ? (
            bills.map((bill) => <BillRow key={bill.id} bill={bill} />)
          ) : (
            <p className="rounded-[18px] bg-[#f6f5ef] px-4 py-6 text-center text-sm text-[#667068]">
              Your bill inbox is clear.
            </p>
          )}
        </div>
      </BillsCard>
      <BillsNotice />
    </BillsShell>
  );
}
