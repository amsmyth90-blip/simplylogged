import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import { formatHealthDate } from "./health-home-model";
import { EmptyPreview, Panel, PanelHeading, ViewAllLink } from "./HealthHomeUi";
import type { BedroomHealthViewModel } from "./useBedroomHealth";

export function HealthRecordPanels({ view }: { view: BedroomHealthViewModel }) {
  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <UpcomingAppointments view={view} />
      <CurrentMedications view={view} />
      <RecentMedicalRecords view={view} />
      <HealthTimeline view={view} />
    </div>
  );
}

function UpcomingAppointments({ view }: { view: BedroomHealthViewModel }) {
  return (
    <Panel>
      <PanelHeading
        title="Upcoming appointments"
        detail="The next appointments you have recorded."
        action={
          <ViewAllLink href="/bedroom/appointments">View all</ViewAllLink>
        }
      />
      {view.upcomingAppointments.length ? (
        <div className="mt-4 space-y-2">
          {view.upcomingAppointments.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href="/bedroom/appointments"
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#f7f5ef] p-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8eee3] text-[#52705a]">
                <UiIcon name="calendar" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">
                  {item.title}
                </span>
                <span className="mt-1 block text-[10px] text-[#667068]">
                  {formatHealthDate(item.date)}
                  {item.time ? ` · ${item.time}` : ""}
                  {item.provider ? ` · ${item.provider}` : ""}
                </span>
              </span>
              <UiIcon name="chevron-right" className="h-4 w-4 text-[#7b847d]" />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPreview
          icon="calendar"
          title="No upcoming appointments"
          detail="Add an appointment when you are ready. Calendar and reminders are only created with your approval."
        />
      )}
    </Panel>
  );
}

function CurrentMedications({ view }: { view: BedroomHealthViewModel }) {
  return (
    <Panel>
      <PanelHeading
        title="Current medications"
        detail="User-confirmed information only; no medication advice."
        action={<ViewAllLink href="/bedroom/medications">View all</ViewAllLink>}
      />
      {view.currentMedications.length ? (
        <div className="mt-4 space-y-2">
          {view.currentMedications.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl bg-[#f7f5ef] p-3">
              <div className="flex justify-between gap-3">
                <p className="text-xs font-semibold">{item.name}</p>
                <span className="text-[10px] text-[#667068]">
                  {item.reviewDate
                    ? `Review ${formatHealthDate(item.reviewDate)}`
                    : "No review date"}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[#667068]">
                {[item.dose, item.frequency, item.prescriber]
                  .filter(Boolean)
                  .join(" · ") || "Details not recorded"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPreview
          icon="file"
          title="No current medications recorded"
          detail="Only add medicines and directions exactly as confirmed by you or your healthcare provider."
        />
      )}
    </Panel>
  );
}

function RecentMedicalRecords({ view }: { view: BedroomHealthViewModel }) {
  return (
    <Panel>
      <PanelHeading
        title="Recent medical records"
        detail="Files remain in private All Files storage."
        action={
          <ViewAllLink href="/bedroom/medical-records">
            View records
          </ViewAllLink>
        }
      />
      {view.healthDocuments.length ? (
        <div className="mt-4 space-y-2">
          {view.healthDocuments.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href={`/document/${item.id}?from=bedroom`}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#f7f5ef] p-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#efebf3] text-[#665c72]">
                <UiIcon name="lock" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">
                  {item.title}
                </span>
                <span className="mt-1 block text-[10px] text-[#667068]">
                  {item.kind} · {item.updated} ·{" "}
                  {item.reviewStatus === "needs-review"
                    ? "Check details"
                    : "Reviewed"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPreview
          icon="folder"
          title="No medical records uploaded"
          detail="Use the secure scan flow to store a file. Failed analysis will not prevent private storage."
        />
      )}
    </Panel>
  );
}

function HealthTimeline({ view }: { view: BedroomHealthViewModel }) {
  return (
    <Panel>
      <PanelHeading
        title="Health timeline"
        detail="Your latest user-recorded health events."
        action={
          <ViewAllLink href="/bedroom/health-timeline">
            View timeline
          </ViewAllLink>
        }
      />
      {view.timeline.length ? (
        <div className="mt-4 space-y-2">
          {view.timeline.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-2xl bg-[#f7f5ef] p-3"
            >
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6f8e72]" />
              <span>
                <span className="block text-xs font-semibold">
                  {item.title}
                </span>
                <span className="mt-1 block text-[10px] capitalize text-[#667068]">
                  {formatHealthDate(item.date)} · {item.type}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPreview
          icon="clock"
          title="No timeline entries yet"
          detail="Dates, documents and events you confirm can be organised here over time."
        />
      )}
    </Panel>
  );
}
