import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";

import { formatHealthDate } from "./bedroom-section-model";
import { HealthCard, HealthRecordRow } from "./BedroomSectionUi";
import { ProfileListHeader, ProfileMiniEmpty } from "./HealthProfileUi";

export function HealthProfileLists() {
  const { state } = useDiaryDockData();
  const health = state.health;
  const medications = health.medications.filter(
    (item) => item.status === "current",
  );
  const conditions = health.conditions.filter((item) => item.status !== "past");
  return (
    <>
      <HealthCard>
        <ProfileListHeader
          eyebrow="Safety details"
          title="Allergies"
          href="/bedroom/allergies"
          actionLabel="Add or review"
        />
        {health.allergies.length ? (
          <div className="mt-4 space-y-2">
            {health.allergies.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-[18px] bg-[#f7e9e4] p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[#6f433c]">
                    {item.allergen}
                  </p>
                  <span className="rounded-full bg-white/70 px-2 py-1 text-[9px] capitalize text-[#765f58]">
                    {item.severity.replaceAll("-", " ")}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-[#765f58]">
                  {item.reaction || "Reaction not recorded"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <ProfileMiniEmpty
            icon="alert"
            text="No allergies have been entered in DiaryDock."
            href="/bedroom/allergies?add=1"
            label="Add an allergy"
          />
        )}
      </HealthCard>
      <HealthCard>
        <ProfileListHeader
          eyebrow="Current records"
          title="Medications"
          href="/bedroom/medications"
          actionLabel="View all"
        />
        {medications.length ? (
          <div className="mt-4 space-y-2">
            {medications.slice(0, 3).map((item) => (
              <HealthRecordRow
                key={item.id}
                icon="file"
                title={item.name}
                meta={[
                  item.dose,
                  item.frequency,
                  item.reviewDate
                    ? `Review ${formatHealthDate(item.reviewDate)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
                notes={item.notes}
              />
            ))}
          </div>
        ) : (
          <ProfileMiniEmpty
            icon="file"
            text="No current medications have been entered."
            href="/bedroom/medications?add=1"
            label="Add medication"
          />
        )}
      </HealthCard>
      <HealthCard>
        <ProfileListHeader
          eyebrow="Personal history"
          title="Conditions"
          href="/bedroom/conditions"
          actionLabel="View all"
        />
        {conditions.length ? (
          <div className="mt-4 space-y-2">
            {conditions.slice(0, 3).map((item) => (
              <HealthRecordRow
                key={item.id}
                icon="heart"
                title={item.name}
                meta={[
                  item.status.replaceAll("-", " "),
                  formatHealthDate(item.recordedDate),
                ].join(" · ")}
                notes={item.notes}
              />
            ))}
          </div>
        ) : (
          <ProfileMiniEmpty
            icon="heart"
            text="No current conditions have been entered."
            href="/bedroom/conditions?add=1"
            label="Add condition"
          />
        )}
      </HealthCard>
      <HealthCard className="bg-[linear-gradient(135deg,#eef2e9,#fffdf8)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-white text-[#52705a]">
            <UiIcon name="folder" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl">Supporting records</h2>
            <p className="mt-1 text-xs leading-5 text-[#667068]">
              Letters and reports remain in the existing private document store.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/bedroom/medical-records"
                className="inline-flex min-h-11 items-center rounded-full bg-[#315443] px-4 text-xs font-semibold text-white"
              >
                View medical records
              </Link>
              <Link
                href="/capture?room=bedroom"
                className="inline-flex min-h-11 items-center rounded-full border border-[#315443]/20 bg-white px-4 text-xs font-semibold"
              >
                Scan a record
              </Link>
            </div>
          </div>
        </div>
      </HealthCard>
    </>
  );
}
