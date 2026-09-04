import type { ReactNode } from "react";

import { BillsCard } from "@/components/bills/BillsUi";
import { ModalShell } from "@/components/ModalShell";
import { UiIcon } from "@/components/UiIcon";
import { openPrivateDocument } from "@/lib/document-storage";
import type { VaultDocument } from "@/lib/mock-data";
import type { VehicleExpense, VehicleRecord } from "@/lib/vehicle-records";

import { ReceiptForm } from "./ReceiptForm";
import { formatReceiptDate, money } from "./receipt-model";
import {
  ReceiptDocumentRow,
  ReceiptEmpty,
  ReceiptSectionTitle,
  ReceiptShell,
} from "./ReceiptShell";
import { useReceiptDetail } from "./useReceiptDetail";

export function ReceiptDetailView({
  vehicle,
  name,
  mileage,
  base,
  receipt,
  document,
}: {
  vehicle: VehicleRecord;
  name: string;
  mileage: number | null;
  base: string;
  receipt: VehicleExpense;
  document?: VaultDocument;
}) {
  const detail = useReceiptDetail(vehicle, receipt, document, base);
  const linkedService = vehicle.services.find(
    (service) => service.id === receipt.linkedServiceId,
  );

  return (
    <ReceiptShell
      vehicle={vehicle}
      name={name}
      mileage={mileage}
      title="Receipt Details"
      backHref={base}
      action={
        <button
          type="button"
          onClick={detail.openEdit}
          className="min-h-11 rounded-full px-3 text-xs font-semibold text-[#315d45]"
        >
          Edit
        </button>
      }
    >
      {detail.message ? (
        <p
          role="status"
          className="rounded-[16px] bg-[#f1ecdf] px-4 py-3 text-[11px] leading-5 text-[#806b45]"
        >
          {detail.message}
        </p>
      ) : null}
      <ReceiptIdentity receipt={receipt} />
      <BillsCard>
        <dl>
          <ReceiptDetail
            label="Payment method"
            value={receipt.paymentMethod || "Not recorded"}
          />
          <ReceiptDetail
            label="Receipt number"
            value={receipt.receiptNumber || "Not recorded"}
          />
          <ReceiptDetail label="Category" value={receipt.category} />
          <ReceiptDetail
            label="Mileage"
            value={
              receipt.mileage
                ? `${receipt.mileage.toLocaleString("en-GB")} miles`
                : "Not recorded"
            }
          />
          <ReceiptDetail
            label="Linked service"
            value={
              linkedService
                ? `${linkedService.title} · ${formatReceiptDate(linkedService.date)}`
                : "Not linked"
            }
          />
          <ReceiptDetail label="Notes" value={receipt.notes || "No notes"} />
        </dl>
      </BillsCard>
      <BillsCard>
        <ReceiptSectionTitle
          title="Document"
          detail="The original receipt is stored privately"
        />
        <div className="mt-4">
          {document ? (
            <ReceiptDocumentRow document={document} vehicleId={vehicle.id} />
          ) : (
            <ReceiptEmpty
              title="No receipt document"
              detail="This expense does not currently have an original file."
            />
          )}
        </div>
      </BillsCard>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ReceiptAction onClick={() => void detail.shareReceipt()}>
          Share summary
        </ReceiptAction>
        <ReceiptAction
          onClick={() =>
            void openPrivateDocument(
              document?.storageBucket,
              document?.storagePath,
            ).catch((reason) =>
              detail.setMessage(
                reason instanceof Error
                  ? reason.message
                  : "Unable to open the document.",
              ),
            )
          }
        >
          Open document
        </ReceiptAction>
        <label className="flex min-h-[68px] cursor-pointer items-center justify-center rounded-[16px] border border-[#20352a]/[0.07] bg-white text-center text-xs font-semibold text-[#45604d]">
          {detail.working ? "Replacing…" : "Replace"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={(event) => void detail.replaceReceipt(event)}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          onClick={() => void detail.deleteReceipt()}
          className="min-h-[68px] rounded-[16px] border border-[#d56b5c]/20 bg-[#fff7f5] text-xs font-semibold text-[#a4473d]"
        >
          Delete
        </button>
      </div>
      <ModalShell
        open={detail.editing}
        title="Edit receipt"
        subtitle="Check changes against the original receipt."
        onClose={() => detail.setEditing(false)}
      >
        <form onSubmit={detail.saveEdit} className="space-y-4">
          {detail.message ? (
            <p
              role="alert"
              className="rounded-[12px] bg-[#fbe5df] p-3 text-xs text-[#a4473d]"
            >
              {detail.message}
            </p>
          ) : null}
          <ReceiptForm
            draft={detail.draft}
            setDraft={detail.setDraft}
            services={vehicle.services}
          />
          <button
            type="submit"
            className="min-h-12 w-full rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
          >
            Save changes
          </button>
        </form>
      </ModalShell>
    </ReceiptShell>
  );
}

function ReceiptIdentity({ receipt }: { receipt: VehicleExpense }) {
  return (
    <BillsCard className="bg-[linear-gradient(135deg,#fffdf8,#f1f4ea)]">
      <div className="flex items-start gap-4">
        <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#52705a] shadow-sm">
          <UiIcon name="file" className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-[#20352a]">
            {receipt.title}
          </p>
          <p className="mt-1 text-[11px] text-[#667068]">
            {receipt.provider || "Merchant not recorded"}
          </p>
          <p className="mt-1 text-[11px] text-[#667068]">
            {formatReceiptDate(receipt.date)}
          </p>
          <p className="mt-3 text-2xl font-semibold text-[#20352a]">
            {money(receipt.amount)}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-[#e5efdf] px-2.5 py-1 text-[9px] font-semibold text-[#45604d]">
            {receipt.category}
          </span>
        </div>
      </div>
    </BillsCard>
  );
}

function ReceiptDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#20352a]/[0.06] py-2.5 last:border-0">
      <dt className="text-xs text-[#667068]">{label}</dt>
      <dd className="max-w-[60%] text-right text-xs font-semibold text-[#20352a]">
        {value}
      </dd>
    </div>
  );
}

function ReceiptAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[68px] rounded-[16px] border border-[#20352a]/[0.07] bg-white text-xs font-semibold text-[#45604d]"
    >
      {children}
    </button>
  );
}
