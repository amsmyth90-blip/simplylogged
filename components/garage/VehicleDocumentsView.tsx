import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { BillsCard } from "@/components/bills/BillsUi";
import { EmptyState, SectionHeading } from "@/components/garage/VehicleProfileUi";
import { cleanText, vehicleDocumentCategory } from "@/components/garage/vehicle-profile-model";
import type { VaultDocument } from "@/lib/mock-data";

export function VehicleDocumentsView({
  vehicleId,
  documents,
  unlinkedDocuments,
  onLink,
}: {
  vehicleId: string;
  documents: VaultDocument[];
  unlinkedDocuments: VaultDocument[];
  onLink: (document: VaultDocument) => void;
}) {
  const categories = Array.from(documents.reduce((counts, document) => {
    const category = vehicleDocumentCategory(document);
    counts.set(category, (counts.get(category) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()));

  return (
    <div className="space-y-4">
      <BillsCard>
        <SectionHeading icon="folder" title="Document categories" detail="Categories are derived from the files linked to this vehicle" />
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {categories.length ? categories.map(([category, count]) => (
            <div key={category} className="rounded-[17px] border border-[#20352a]/[0.06] bg-[#faf9f4] p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-[#52705a]"><UiIcon name={category === "Insurance" ? "shield" : category === "MOT" ? "calendar" : category === "Repairs" ? "gear" : "file"} className="h-4 w-4" /></span>
              <p className="mt-3 text-[12px] font-semibold text-[#20352a]">{category}</p>
              <p className="mt-0.5 text-[10px] text-[#667068]">{count} document{count === 1 ? "" : "s"}</p>
            </div>
          )) : <div className="col-span-2 sm:col-span-3"><EmptyState icon="folder" title="No document categories yet" detail="Categories will appear as vehicle files are linked." /></div>}
        </div>
      </BillsCard>

      <BillsCard>
        <SectionHeading icon="file" title="Vehicle documents" detail="Original files remain in All Files and are linked here" action={<span className="rounded-full bg-[#eef2e9] px-2.5 py-1 text-[10px] font-semibold text-[#52705a]">{documents.length}</span>} />
        <div className="mt-4 space-y-2">
          {documents.length ? documents.map((document) => (
            <Link key={document.id}
              href={`/document/${document.id}?from=vehicle&vehicleId=${vehicleId}`}
              className="group flex min-h-[74px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] motion-reduce:transform-none">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="file" className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#20352a]">
                  {cleanText(document.title)}
                </span>
                <span className="mt-0.5 block text-[11px] text-[#667068]">
                  {cleanText(document.kind)} · {cleanText(document.size)} ·
                  {` ${cleanText(document.updated)}`}
                </span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
            </Link>
          )) : <EmptyState icon="file" title="No vehicle documents yet" detail="Use the main Scan button to securely add a V5C, MOT certificate, policy, warranty or receipt." />}
        </div>
        <Link href="/capture?room=garage"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#2f5140] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2">
          <UiIcon name="plus" className="h-4 w-4" />Scan or upload a document
        </Link>
      </BillsCard>

      {unlinkedDocuments.length ? (
        <BillsCard>
          <SectionHeading icon="folder" title="Unassigned Garage files" detail="Choose which files genuinely belong to this vehicle" />
          <div className="mt-4 space-y-2">
            {unlinkedDocuments.map((document) => (
              <div key={document.id} className="flex min-h-[70px] items-center gap-3 rounded-[17px] border border-[#20352a]/[0.06] bg-[#faf9f4] px-3 py-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-[#52705a]"><UiIcon name="file" className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#20352a]">{cleanText(document.title)}</span><span className="mt-0.5 block text-[10px] text-[#667068]">{cleanText(document.kind)} · {cleanText(document.updated)}</span></span>
                <button type="button" onClick={() => onLink(document)} className="min-h-11 rounded-[12px] border border-[#6f8e72]/30 bg-white px-3 text-[11px] font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Link</button>
              </div>
            ))}
          </div>
        </BillsCard>
      ) : null}
      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">Vehicle files use DiaryDock&apos;s existing private document store. File links are generated only for the signed-in user and are not placed directly in page code.</p>
    </div>
  );
}
