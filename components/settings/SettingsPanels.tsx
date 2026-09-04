import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import { SectionHeader } from "@/components/SectionHeader";
import { UiIcon } from "@/components/UiIcon";
import type { StorageSummary } from "@/components/settings/settings-model";
import { OPTIONAL_DASHBOARD_AREAS } from "@/lib/dashboard-areas";
import type {
  OnboardingState,
  SettingGroup,
  SettingsProfile,
} from "@/lib/diarydock-data";
import { estateAreas, vaultSecurity } from "@/lib/mock-data";

export function SettingsProfilePanel({
  onEdit,
  profile,
}: {
  onEdit: () => void;
  profile: SettingsProfile;
}) {
  return (
    <section className="estate-sheet flex items-center gap-4 p-5">
      <Avatar initials={profile.initials} size="lg" />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {profile.name}
        </h2>
        <p className="mt-0.5 truncate text-sm text-ink/55">{profile.email}</p>
        <p className="mt-1 text-xs text-ink/45">
          Member since {profile.memberSince}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-xs font-semibold text-ink/70 transition hover:bg-white"
      >
        Edit
      </button>
    </section>
  );
}

export function SettingsStoragePanel({
  summary,
}: {
  summary: StorageSummary | null;
}) {
  if (!summary) return null;
  const limit =
    summary.limitBytes >= 1024 ** 3
      ? `${(summary.limitBytes / 1024 ** 3).toFixed(0)} GB`
      : `${Math.round(summary.limitBytes / 1024 ** 2)} MB`;
  return (
    <section className="estate-sheet p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Document storage</p>
          <p className="mt-1 text-xs text-ink/50">
            {(summary.usedBytes / 1024 ** 2).toFixed(1)} MB used of {limit}
          </p>
        </div>
        <span className="rounded-full bg-sage/55 px-3 py-1 text-xs font-semibold capitalize text-moss">
          {summary.tier}
        </span>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10"
        aria-label="Document storage used"
      >
        <div
          className="h-full rounded-full bg-moss"
          style={{
            width: `${Math.min(100, (summary.usedBytes / summary.limitBytes) * 100)}%`,
          }}
        />
      </div>
    </section>
  );
}

export function SettingsDashboardAreas({
  onboarding,
  onToggle,
}: {
  onboarding: OnboardingState;
  onToggle: (roomId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Dashboard areas"
        hint="Show only the parts of DiaryDock that are useful to you"
      />
      <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
        {OPTIONAL_DASHBOARD_AREAS.map((question) => {
          const area = estateAreas.find((item) => item.id === question.roomId);
          const enabled =
            !onboarding.dashboardAreasConfigured ||
            onboarding.selectedRooms.includes(question.roomId);
          if (!area) return null;
          return (
            <div
              key={question.roomId}
              className="flex items-center gap-3.5 px-4 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/55 text-moss">
                <UiIcon name={area.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {area.dashboardLabel ?? area.name}
                </span>
                <span className="mt-0.5 block text-xs text-ink/50">
                  {question.detail}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`Show ${area.dashboardLabel ?? area.name} on dashboard`}
                onClick={() => onToggle(question.roomId)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-moss" : "bg-slate-300/80"}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all ${enabled ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </div>
          );
        })}
        <div className="bg-white/35 px-4 py-3 text-xs leading-5 text-ink/50">
          Home, Documents, Inbox and Settings always stay on your dashboard.
        </div>
      </div>
    </section>
  );
}

export function SettingsGroups({
  groups,
  onToggle,
}: {
  groups: SettingGroup[];
  onToggle: (group: string, label: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <SectionHeader title={group.title} />
          <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
            {group.rows.map((row) => {
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {row.label}
                    </p>
                    {row.hint ? (
                      <p className="mt-0.5 text-xs text-ink/50">{row.hint}</p>
                    ) : null}
                  </div>
                  {row.kind === "toggle" ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.value}
                      aria-label={row.label}
                      onClick={() => onToggle(group.title, row.label)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${row.value ? "bg-moss" : "bg-slate-300/80"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${row.value ? "left-[22px]" : "left-0.5"}`}
                      />
                    </button>
                  ) : row.kind === "value" ? (
                    <span className="shrink-0 rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/60">
                      {row.value}
                    </span>
                  ) : (
                    <UiIcon
                      name="chevron-right"
                      className="h-4 w-4 shrink-0 text-ink/30"
                    />
                  )}
                </>
              );
              return row.kind === "link" ? (
                <Link
                  key={row.label}
                  href={row.href}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60"
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={row.label}
                  className="flex items-center gap-3.5 px-4 py-3.5"
                >
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

export function SettingsStatus({ enabledToggles }: { enabledToggles: number }) {
  return (
    <section className="estate-sheet p-5">
      <SectionHeader
        title="DiaryDock status"
        hint="At-a-glance confidence checks"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatusCard
          title="Document storage"
          detail={`${vaultSecurity.protection}. Backup status is not shown in DiaryDock.`}
        />
        <StatusCard
          title="Sign-in protection"
          detail="Your current Supabase sign-in protects this account. No trusted-device list is configured."
        />
        <StatusCard
          title="Preferences"
          detail={`${enabledToggles} live preferences are currently switched on for this household.`}
        />
      </div>
    </section>
  );
}

function StatusCard({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="rounded-3xl bg-white/65 p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink/55">{detail}</p>
    </div>
  );
}

export function SettingsSupport() {
  return (
    <section className="space-y-3">
      <SectionHeader title="Support" />
      <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
        <a
          href="mailto:hello@diarydock.com?subject=DiaryDock%20support"
          className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/55 text-moss">
            <UiIcon name="mail" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Email support</p>
            <p className="mt-0.5 text-xs text-ink/50">hello@diarydock.com</p>
          </div>
          <UiIcon
            name="chevron-right"
            className="h-4 w-4 shrink-0 text-ink/30"
          />
        </a>
        <Link
          href="/support"
          className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/60"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Support centre</p>
            <p className="mt-0.5 text-xs text-ink/50">
              Account, privacy, and app help
            </p>
          </div>
          <UiIcon
            name="chevron-right"
            className="h-4 w-4 shrink-0 text-ink/30"
          />
        </Link>
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">App version</p>
          </div>
          <span className="text-xs font-medium text-ink/45">
            DiaryDock 0.1.0
          </span>
        </div>
      </div>
    </section>
  );
}
