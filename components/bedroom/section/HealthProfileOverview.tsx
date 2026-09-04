import Link from "next/link";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { healthProfileProgress } from "@/lib/health-records";

import { formatHealthDate } from "./bedroom-section-model";
import { HealthCard } from "./BedroomSectionUi";
import { ProfileContact, ProfileTile } from "./HealthProfileUi";

export function HealthProfileOverview({
  emergencyOnly,
  onEdit,
}: {
  emergencyOnly: boolean;
  onEdit: () => void;
}) {
  const { state } = useDiaryDockData();
  const health = state.health;
  const contacts = state.professionalContacts.contacts;
  const progress = healthProfileProgress(health);
  const currentMedications = health.medications.filter(
    (item) => item.status === "current",
  );
  const currentConditions = health.conditions.filter(
    (item) => item.status !== "past",
  );
  const lastReviewed = health.profile.lastReviewedAt
    ? formatHealthDate(health.profile.lastReviewedAt.slice(0, 10))
    : "Not reviewed yet";
  const findContact = (id: string) =>
    contacts.find((contact) => contact.id === id);

  return (
    <>
      <section className="overflow-hidden rounded-[28px] bg-[#315443] p-5 text-white shadow-[0_24px_55px_-35px_rgba(32,53,42,0.72)]">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-white/12 text-[#dce9d7] sm:flex">
            <UiIcon
              name={emergencyOnly ? "shield" : "heart"}
              className="h-6 w-6"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              {emergencyOnly ? "Emergency information" : "Your private summary"}
            </p>
            <h2 className="mt-1 font-serif text-2xl">
              {emergencyOnly ? "Ready when it matters" : "Health Profile"}
            </h2>
            <p className="mt-2 max-w-lg text-xs leading-5 text-white/72">
              {emergencyOnly
                ? "Keep the essential information you would want available in an emergency."
                : "A clear, user-maintained summary of the information you have chosen to record."}
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 shrink-0 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Edit
          </button>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <div className="flex justify-between text-[10px] text-white/70">
              <span>Profile organised</span>
              <span>
                {progress.completed} of {progress.total}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12">
              <span
                className="block h-full rounded-full bg-[#c6d8bd]"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
          <span className="font-serif text-3xl">{progress.percent}%</span>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-white/60">
          <UiIcon name="check" className="h-3.5 w-3.5" />
          <span>Last checked: {lastReviewed}</span>
        </div>
      </section>
      <HealthCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">
              At a glance
            </p>
            <h2 className="mt-1 font-serif text-2xl">Important information</h2>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8eee3] text-[#52705a]">
            <UiIcon name="lock" className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ProfileTile
            icon="heart"
            label="Blood group"
            value={health.profile.bloodGroup || "Not recorded"}
          />
          <ProfileTile
            icon="alert"
            label="Allergies"
            value={
              health.allergies.length
                ? `${health.allergies.length} recorded`
                : "None recorded"
            }
            href="/bedroom/allergies"
          />
          <ProfileTile
            icon="file"
            label="Current conditions"
            value={
              currentConditions.length
                ? `${currentConditions.length} recorded`
                : "None recorded"
            }
            href="/bedroom/conditions"
          />
          <ProfileTile
            icon="check"
            label="Current medicines"
            value={
              currentMedications.length
                ? `${currentMedications.length} recorded`
                : "None recorded"
            }
            href="/bedroom/medications"
          />
        </div>
        <p className="mt-3 text-[10px] leading-4 text-[#778078]">
          “None recorded” means nothing has been entered in DiaryDock; it is not
          a clinical statement.
        </p>
      </HealthCard>
      <HealthCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f8e72]">
              Care team
            </p>
            <h2 className="mt-1 font-serif text-2xl">Contacts</h2>
          </div>
          <Link
            href="/bedroom/contacts"
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#52705a]"
          >
            Manage
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          <ProfileContact
            label="GP or practice"
            contact={findContact(health.profile.gpContactId)}
            icon="heart"
          />
          <ProfileContact
            label="Pharmacy"
            contact={findContact(health.profile.pharmacyContactId)}
            icon="file"
          />
          <ProfileContact
            label="Emergency contact"
            contact={findContact(health.profile.emergencyContactId)}
            icon="phone"
          />
        </div>
      </HealthCard>
      {emergencyOnly ? (
        <HealthCard className="bg-[linear-gradient(135deg,#f4e9e5,#fffdf8)]">
          <h2 className="font-serif text-xl">Emergency notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#5f625e]">
            {health.profile.emergencyNotes ||
              "No emergency notes have been recorded."}
          </p>
        </HealthCard>
      ) : null}
    </>
  );
}
