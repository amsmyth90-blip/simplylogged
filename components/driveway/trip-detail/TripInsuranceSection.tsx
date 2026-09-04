"use client";
import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";
import {
  EmptySection,
  formatTripDate,
  SectionHeading,
} from "./trip-detail-shared";
import type { TripDetailController } from "./useTripDetailController";
export function TripInsuranceSection({
  controller,
}: {
  controller: TripDetailController;
}) {
  const { state, trip, linkedPolicy, patchTrip } = controller;
  if (!trip) return null;
  return (
    <section>
      <SectionHeading
        title="Travel insurance"
        detail="Link an existing policy; DiaryDock does not decide whether it covers this trip."
      />
      {linkedPolicy ? (
        <article className="mt-5 rounded-[24px] border border-[#20352a]/[0.07] bg-white/90 p-5">
          <div className="flex gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#e8eee3] text-[#315b42]">
              <UiIcon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">{linkedPolicy.title}</h3>
              <p className="mt-1 text-xs text-[#667068]">
                {linkedPolicy.provider} · {linkedPolicy.policyNumberMasked}
              </p>
              <p className="mt-2 text-[10px]">
                {formatTripDate(linkedPolicy.startDate)} to{" "}
                {formatTripDate(linkedPolicy.renewalDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => patchTrip({ linkedInsurancePolicyId: undefined })}
            className="mt-4 min-h-11 rounded-full border border-[#8a5145]/20 px-4 text-xs font-semibold text-[#8a5145]"
          >
            Unlink policy
          </button>
        </article>
      ) : (
        <div className="mt-5">
          <EmptySection
            icon="shield"
            title="No travel insurance policy is linked in DiaryDock"
            detail="This does not mean the travellers are uninsured. Link a suitable existing policy after reviewing its cover."
          />
        </div>
      )}
      <label className="mt-4 block text-xs font-semibold">
        Link an existing policy
        <select
          value={trip.linkedInsurancePolicyId ?? ""}
          onChange={(event) =>
            patchTrip({
              linkedInsurancePolicyId: event.target.value || undefined,
            })
          }
          className="mt-2 min-h-12 w-full rounded-2xl border border-[#20352a]/10 bg-white px-3 text-sm font-normal"
        >
          <option value="">No policy linked</option>
          {state.insurance.policies.map((policy) => (
            <option key={policy.id} value={policy.id}>
              {policy.title} · {policy.provider}
            </option>
          ))}
        </select>
      </label>
      <Link
        href="/office/insurance"
        className="mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-[#52705a]/20 bg-[#eef2e9] text-sm font-semibold text-[#315b42]"
      >
        Open Insurance Hub
      </Link>
    </section>
  );
}
