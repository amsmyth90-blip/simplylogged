import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";

import { primarySections } from "./health-home-model";
import {
  EmptyPreview,
  Panel,
  PanelHeading,
  SectionCard,
  ViewAllLink,
} from "./HealthHomeUi";
import type { BedroomHealthViewModel } from "./useBedroomHealth";

export function HealthAtGlance({ view }: { view: BedroomHealthViewModel }) {
  const metrics = [
    { label: "Appointments", value: view.upcomingAppointments.length },
    { label: "Current medicines", value: view.currentMedications.length },
    { label: "Recorded allergies", value: view.health.allergies.length },
    {
      label: "Needs review",
      value: view.healthDocuments.filter(
        (item) => item.reviewStatus === "needs-review",
      ).length,
    },
  ];
  return (
    <section className="mt-5 overflow-hidden rounded-[28px] bg-[#315443] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.72)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
        Your health at a glance
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/[0.08] p-3"
          >
            <p className="text-2xl font-semibold">{item.value}</p>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-white/65">
              {item.label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[10px]">
          <span>Emergency profile</span>
          <span>
            {view.profileProgress.completed} of {view.profileProgress.total}{" "}
            details organised
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12">
          <span
            className="block h-full rounded-full bg-[#c6d8bd]"
            style={{ width: `${view.profileProgress.percent}%` }}
          />
        </div>
      </div>
    </section>
  );
}

export function ReviewAndProfile({ view }: { view: BedroomHealthViewModel }) {
  const profileItems = [
    {
      label: "GP",
      value: view.gp
        ? `${view.gp.firstName} ${view.gp.lastName}`.trim() || view.gp.company
        : "Not linked",
    },
    {
      label: "Pharmacy",
      value: view.pharmacy
        ? view.pharmacy.company ||
          `${view.pharmacy.firstName} ${view.pharmacy.lastName}`.trim()
        : "Not linked",
    },
    {
      label: "Allergies",
      value: view.health.allergies.length
        ? `${view.health.allergies.length} recorded`
        : "None recorded",
    },
    {
      label: "Current medicines",
      value: view.currentMedications.length
        ? `${view.currentMedications.length} recorded`
        : "None recorded",
    },
    {
      label: "Blood group",
      value: view.health.profile.bloodGroup ? "Recorded" : "Not recorded",
    },
    {
      label: "Emergency contact",
      value: view.health.profile.emergencyContactId
        ? "Recorded"
        : "Not recorded",
    },
  ];
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Panel>
        <PanelHeading
          title="Things to review"
          detail="Only actions based on information you have recorded."
        />
        {view.reviews.length ? (
          <div className="mt-4 space-y-2">
            {view.reviews.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#f7f5ef] px-3 text-xs"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6f8e72]">
                  <UiIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 leading-5">{item.text}</span>
                <UiIcon
                  name="chevron-right"
                  className="h-4 w-4 text-[#7b847d]"
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPreview
            icon="check"
            title="Nothing needs your review"
            detail="DiaryDock will show recorded appointments, review dates and documents here when relevant."
          />
        )}
      </Panel>
      <Panel>
        <PanelHeading
          title="Health profile preview"
          detail="A restrained summary of information you have chosen to record."
          action={
            <ViewAllLink href="/bedroom/health-profile">
              View profile
            </ViewAllLink>
          }
        />
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {profileItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#f7f5ef] p-3">
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-[#7b847d]">
                {item.label}
              </dt>
              <dd className="mt-1 font-semibold text-[#20352a]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}

export function PrimaryHealthSections({
  view,
}: {
  view: BedroomHealthViewModel;
}) {
  return (
    <section className="mt-7">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f8e72]">
          Bedroom
        </p>
        <h2 className="mt-1 font-serif text-3xl">Your health records</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {primarySections.map((section) => (
          <SectionCard
            key={section.href}
            section={section}
            count={view.sectionCounts[section.title] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
