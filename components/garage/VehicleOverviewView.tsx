import { BillsCard } from "@/components/bills/BillsUi";
import {
  ActionButton,
  DetailRow,
  EmptyState,
  SectionHeading,
} from "@/components/garage/VehicleProfileUi";
import { cleanText, dateHelper, formatDate, formatMoney } from "@/components/garage/vehicle-profile-model";
import { UiIcon, type IconName } from "@/components/UiIcon";
import type { VaultDocument } from "@/lib/mock-data";
import type { VehicleMileageEntry, VehicleRecord } from "@/lib/vehicle-records";

export function VehicleOverviewView({
  vehicle,
  mileage,
  primaryPhoto,
  onEdit,
  onMileage,
  onNote,
}: {
  vehicle: VehicleRecord;
  mileage?: VehicleMileageEntry;
  primaryPhoto?: VaultDocument;
  onEdit: () => void;
  onMileage: () => void;
  onNote: () => void;
}) {
  const completeness = [
    vehicle.make,
    vehicle.model,
    vehicle.registration,
    vehicle.vin,
    vehicle.year,
    vehicle.ownershipStatus !== "unknown",
    mileage,
    primaryPhoto,
  ].filter(Boolean).length;
  const health = completeness < 8 ? "Add details" : "Complete";
  const healthPercent = Math.round((completeness / 8) * 100);
  const recentActivity = vehicle.audit
    .filter((entry) => /vehicle|mileage|photo|note/i.test(entry.action))
    .map((entry) => ({ id: entry.id, title: cleanText(entry.action), date: entry.createdAt, icon: "check" as IconName }))
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 5);
  const statusCards = [
    { label: "Mileage", value: mileage ? `${mileage.mileage.toLocaleString("en-GB")} miles` : "Not recorded", helper: mileage ? `Updated ${formatDate(mileage.recordedAt)}` : "Add a reading", date: "", icon: "chart" as IconName },
    { label: "Registration", value: vehicle.registration || "Not recorded", helper: "Vehicle identity", date: "", icon: "car" as IconName },
    { label: "Ownership", value: vehicle.ownershipStatus === "unknown" ? "Not recorded" : vehicle.ownershipStatus, helper: vehicle.keeperName || "Add registered keeper", date: "", icon: "users" as IconName },
    { label: "Current value", value: formatMoney(vehicle.currentValue), helper: vehicle.currentValueUpdatedAt ? `Updated ${formatDate(vehicle.currentValueUpdatedAt)}` : "Optional estimate", date: "", icon: "chart" as IconName },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statusCards.map((card) => {
          const helper = card.date ? dateHelper(card.date) : { text: card.helper, tone: "text-[#667068]" };
          return (
            <BillsCard key={card.label} className="!p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#667068]"><UiIcon name={card.icon} className="h-4 w-4" />{card.label}</div>
              <p className="mt-3 text-[15px] font-semibold text-[#20352a]">{card.value}</p>
              <p className={`mt-1 text-[10px] font-medium ${helper.tone}`}>{helper.text}</p>
            </BillsCard>
          );
        })}
      </div>

      <BillsCard className="bg-[linear-gradient(135deg,#edf5ea,#fffdf8)]">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading icon="car" title="Profile completeness" detail="Identity, ownership, mileage and vehicle photo" />
          <span className={`text-sm font-semibold ${health === "Complete" ? "text-[#317047]" : "text-[#a46b2c]"}`}>{health}</span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dde5db]"><div className="h-full rounded-full bg-[#3f7850] transition-[width] motion-reduce:transition-none" style={{ width: `${healthPercent}%` }} /></div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-[#667068]">
          <span>{completeness} of 8 key details recorded</span>
          <button type="button" onClick={onEdit} className="min-h-11 rounded-[12px] px-3 font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Complete profile</button>
        </div>
      </BillsCard>

      <BillsCard>
        <SectionHeading icon="car" title="Vehicle details" detail="Identity, ownership and value" action={<button type="button" onClick={onEdit} className="min-h-11 rounded-[12px] px-3 text-xs font-semibold text-[#45604d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]">Edit</button>} />
        <dl className="mt-4">
          <DetailRow label="Make & model" value={[vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ")} />
          <DetailRow label="Registration" value={vehicle.registration} />
          <DetailRow label="VIN / chassis no." value={vehicle.vin} />
          <DetailRow label="Fuel & transmission" value={[vehicle.fuelType, vehicle.transmission].filter(Boolean).join(" · ")} />
          <DetailRow label="Ownership" value={vehicle.ownershipStatus === "unknown" ? "Not recorded" : vehicle.ownershipStatus} />
          <DetailRow label="Purchased" value={formatDate(vehicle.purchaseDate)} />
          <DetailRow label="Current value" value={formatMoney(vehicle.currentValue)} />
        </dl>
      </BillsCard>

      <BillsCard>
        <SectionHeading icon="plus" title="Profile actions" detail="Only identity, mileage, photos and notes live here" />
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <ActionButton icon="car" label="Edit details" onClick={onEdit} />
          <ActionButton icon="chart" label="Mileage" onClick={onMileage} />
          <ActionButton icon="plus" label="Add note" onClick={onNote} />
        </div>
      </BillsCard>

      <BillsCard>
        <SectionHeading icon="clock" title="Recent profile activity" detail="Identity, mileage, photo and note changes" />
        <div className="mt-4 space-y-2">
          {recentActivity.length ? recentActivity.map((entry) => (
            <div key={entry.id} className="flex min-h-[58px] items-center gap-3 rounded-[16px] bg-[#f7f7f1] px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#52705a]"><UiIcon name={entry.icon} className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#20352a]">{entry.title}</span><span className="mt-0.5 block text-[10px] text-[#667068]">{entry.date ? formatDate(entry.date.slice(0, 10)) : "Date not recorded"}</span></span>
            </div>
          )) : <EmptyState icon="clock" title="No activity yet" detail="Updates you make to this vehicle will appear here." />}
        </div>
      </BillsCard>
    </div>
  );
}
