import type { IconName } from "@/components/UiIcon";

import { formatHealthDate } from "./bedroom-section-model";
import {
  HealthAddButton,
  HealthCard,
  HealthEmpty,
  HealthRecordRow,
} from "./BedroomSectionUi";
import type { BedroomSectionController } from "./useBedroomSection";

type DisplayRecord = {
  id: string;
  icon: IconName;
  title: string;
  meta: string;
  notes?: string;
};

export function BedroomRecords({
  bedroom,
}: {
  bedroom: BedroomSectionController;
}) {
  const records = sectionRecords(bedroom);
  return (
    <HealthCard>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">{bedroom.meta.title}</h2>
          <p className="mt-1 text-xs text-[#667068]">
            {records.length
              ? `${records.length} record${records.length === 1 ? "" : "s"}`
              : "Nothing recorded yet"}
          </p>
        </div>
        {bedroom.addable ? (
          <HealthAddButton
            onClick={() => {
              bedroom.setMessage("");
              bedroom.setAdding(true);
            }}
            label="Add"
          />
        ) : null}
      </div>
      <div className="mt-4 space-y-2">
        {records.length ? (
          records.map((record) => (
            <HealthRecordRow key={record.id} {...record} />
          ))
        ) : (
          <HealthEmpty
            icon={bedroom.meta.icon}
            title={`No ${bedroom.meta.title.toLowerCase()} yet`}
            detail="This area begins empty so DiaryDock never invents personal health information. Add a record only when you choose to."
            action={
              bedroom.addable ? (
                <HealthAddButton
                  onClick={() => bedroom.setAdding(true)}
                  label="Add first record"
                />
              ) : undefined
            }
          />
        )}
      </div>
    </HealthCard>
  );
}

function sectionRecords(bedroom: BedroomSectionController): DisplayRecord[] {
  const { health, section } = bedroom;
  if (section === "medications") {
    return health.medications.map((item) => ({
      id: item.id,
      icon: "file",
      title: item.name,
      meta: [
        item.dose,
        item.frequency,
        item.status,
        item.reviewDate ? `Review ${formatHealthDate(item.reviewDate)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      notes: item.notes,
    }));
  }
  if (section === "appointments") {
    return health.appointments.map((item) => ({
      id: item.id,
      icon: "calendar",
      title: item.title,
      meta: [
        formatHealthDate(item.date),
        item.time,
        item.provider,
        item.location,
        item.status,
      ]
        .filter(Boolean)
        .join(" · "),
      notes: item.preparationNotes || item.followUpNotes,
    }));
  }
  if (section === "tests") {
    return health.tests.map((item) => ({
      id: item.id,
      icon: "chart",
      title: item.title,
      meta: [
        formatHealthDate(item.date),
        item.provider,
        `Follow-up ${item.followUpStatus}`,
      ]
        .filter(Boolean)
        .join(" · "),
      notes: item.notes,
    }));
  }
  if (
    section === "health-timeline" ||
    section === "medical-devices" ||
    section === "procedures"
  ) {
    return [...health.timeline]
      .filter((item) =>
        section === "medical-devices"
          ? item.type === "other"
          : section === "procedures"
            ? item.type === "procedure"
            : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((item) => ({
        id: item.id,
        icon: "clock",
        title: item.title,
        meta: [formatHealthDate(item.date), item.type].join(" · "),
        notes: item.notes,
      }));
  }
  if (section === "dental-optical") {
    return health.dentalOptical.map((item) => ({
      id: item.id,
      icon: "sun",
      title: item.title,
      meta: [item.type, formatHealthDate(item.date), item.provider]
        .filter(Boolean)
        .join(" · "),
      notes: item.notes,
    }));
  }
  if (section === "vaccinations") {
    return health.vaccinations.map((item) => ({
      id: item.id,
      icon: "check",
      title: item.name,
      meta: [
        formatHealthDate(item.date),
        item.provider,
        item.nextDate ? `Next ${formatHealthDate(item.nextDate)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      notes: item.notes,
    }));
  }
  if (section === "wellbeing") {
    return health.wellbeing.map((item) => ({
      id: item.id,
      icon: "bed",
      title: item.title,
      meta: [
        formatHealthDate(item.date),
        item.sleepHours !== undefined
          ? `${item.sleepHours} sleep hours recorded`
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
      notes: item.notes,
    }));
  }
  if (section === "allergies") {
    return health.allergies.map((item) => ({
      id: item.id,
      icon: "alert",
      title: item.allergen,
      meta: [item.reaction, item.severity.replaceAll("-", " ")]
        .filter(Boolean)
        .join(" · "),
      notes: item.notes,
    }));
  }
  if (section === "conditions") {
    return health.conditions.map((item) => ({
      id: item.id,
      icon: "file",
      title: item.name,
      meta: [
        item.status.replaceAll("-", " "),
        formatHealthDate(item.recordedDate),
      ].join(" · "),
      notes: item.notes,
    }));
  }
  return [];
}
