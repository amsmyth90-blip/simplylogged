import Link from "next/link";
import type { ChangeEvent } from "react";

import { UiIcon } from "@/components/UiIcon";
import { BillsCard } from "@/components/bills/BillsUi";
import {
  EmptyState,
  PrivateVehicleImage,
  SectionHeading,
} from "@/components/garage/VehicleProfileUi";
import { cleanText, formatDate } from "@/components/garage/vehicle-profile-model";
import type { VaultDocument } from "@/lib/mock-data";
import type { VehicleRecord } from "@/lib/vehicle-records";

export function VehicleNotesView({
  vehicle,
  photos,
  uploadingPhoto,
  onPhoto,
  onGeneralNote,
  onEmergencyNote,
}: {
  vehicle: VehicleRecord;
  photos: VaultDocument[];
  uploadingPhoto: boolean;
  onPhoto: (event: ChangeEvent<HTMLInputElement>) => void;
  onGeneralNote: () => void;
  onEmergencyNote: () => void;
}) {
  const generalNotes = vehicle.notes.filter((note) => note.kind === "general");
  const emergencyNotes = vehicle.notes.filter((note) => note.kind === "emergency");
  return (
    <div className="space-y-4">
      <BillsCard>
        <SectionHeading icon="file" title="Notes" detail="Condition, accessories, damage and other useful context" action={<button type="button" onClick={onGeneralNote} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Add note</button>} />
        <div className="mt-4 space-y-3">
          {generalNotes.length ? generalNotes.map((note) => (
            <article key={note.id} className="rounded-[18px] border border-[#20352a]/[0.07] bg-white p-4">
              <h3 className="text-sm font-semibold text-[#20352a]">{note.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-[#667068]">{note.content}</p>
              <p className="mt-3 text-[10px] text-[#667068]">Updated {formatDate(note.updatedAt.slice(0, 10))}</p>
            </article>
          )) : <EmptyState icon="file" title="No notes yet" detail="Record condition checks, accessories, damage or anything useful to remember." />}
        </div>
      </BillsCard>

      <BillsCard>
        <SectionHeading icon="camera" title="Photos" detail="Private images connected to this vehicle" />
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((document) => (
            <div key={document.id} className="relative aspect-square overflow-hidden rounded-[15px] bg-[#e7eadf]">
              <PrivateVehicleImage document={document} alt={cleanText(document.title)} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-[#20352a]/70 px-2 py-1 text-[9px] text-white">{cleanText(document.title)}</span>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[15px] border border-dashed border-[#6f8e72]/40 bg-[#f7f7f1] text-[10px] font-semibold text-[#52705a] focus-within:ring-2 focus-within:ring-[#6f8e72]">
            <UiIcon name="plus" className="mb-1 h-5 w-5" />
            Add photo
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={onPhoto} disabled={uploadingPhoto} className="sr-only" />
          </label>
        </div>
      </BillsCard>

      <BillsCard className="bg-[#fff2ed]">
        <SectionHeading icon="alert" title="Emergency information" detail="Spare keys, breakdown details and instructions for urgent situations" action={<button type="button" onClick={onEmergencyNote} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#9a4f43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a4f43]">Add</button>} />
        <div className="mt-4 space-y-2">
          {emergencyNotes.length ? emergencyNotes.map((note) => (
            <div key={note.id} className="rounded-[16px] bg-white/75 p-3">
              <p className="text-[12px] font-semibold text-[#7f3f37]">{note.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#667068]">{note.content}</p>
            </div>
          )) : <p className="text-[12px] leading-5 text-[#667068]">No emergency information has been added.</p>}
        </div>
      </BillsCard>

      <Link href="/family" className="flex min-h-[78px] items-center gap-3 rounded-[18px] border border-[#20352a]/[0.07] bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef2e9] text-[#52705a]"><UiIcon name="users" className="h-5 w-5" /></span>
        <span className="flex-1"><span className="block text-sm font-semibold text-[#20352a]">Trusted access</span><span className="mt-0.5 block text-[11px] text-[#667068]">Review household access without granting it automatically</span></span>
        <UiIcon name="chevron-right" className="h-4 w-4 text-[#6f8e72]" />
      </Link>

      <BillsCard>
        <SectionHeading icon="clock" title="Record history" detail="A private audit trail of changes to this vehicle" />
        <div className="mt-4 space-y-2">
          {vehicle.audit.length ? vehicle.audit.slice(0, 10).map((entry) => (
            <div key={entry.id} className="flex min-h-[58px] items-center gap-3 rounded-[16px] bg-[#f7f7f1] px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name="check" className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#20352a]">{cleanText(entry.action)}</span><span className="mt-0.5 block text-[10px] text-[#667068]">{formatDate(entry.createdAt.slice(0, 10))}</span></span>
            </div>
          )) : <p className="text-[12px] text-[#667068]">No changes have been recorded yet.</p>}
        </div>
      </BillsCard>
    </div>
  );
}
