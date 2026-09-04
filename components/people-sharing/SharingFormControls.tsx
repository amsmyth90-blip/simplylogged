import type { HouseholdRole } from "@/lib/household-sharing";

import type { MemberSummary } from "./sharing-panel-types";

export function MemberCounts({ summary }: { summary: MemberSummary }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-white/75 p-3">
        <p className="text-xl font-semibold text-ink">
          {summary.householdCount}
        </p>
        <p className="text-xs text-ink/48">Shared with household</p>
      </div>
      <div className="rounded-xl bg-white/75 p-3">
        <p className="text-xl font-semibold text-ink">
          {summary.selectedCount}
        </p>
        <p className="text-xs text-ink/48">Shared just with them</p>
      </div>
    </div>
  );
}

export function DraftInput({
  email,
  label,
  onChange,
  value,
}: {
  email?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-ink/60">{label}</span>
      <input
        type={email ? "email" : "text"}
        autoComplete={email ? "email" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm outline-none"
      />
    </label>
  );
}

export function RoleChoices({
  invite,
  onChange,
  value,
}: {
  invite?: boolean;
  onChange: (role: Exclude<HouseholdRole, "owner">) => void;
  value: Exclude<HouseholdRole, "owner">;
}) {
  const choices = invite
    ? [
        ["viewer", "Member", "View deliberately shared items"],
        ["member", "Adult", "Contribute to shared spaces"],
      ]
    : [
        ["member", "Adult", "Can contribute to shared spaces"],
        ["viewer", "Member", "Can view deliberately shared items"],
      ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {choices.map(([role, label, detail]) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role as Exclude<HouseholdRole, "owner">)}
          aria-pressed={value === role}
          className={`rounded-2xl border p-3 text-left ${value === role ? "border-moss/30 bg-sage/60" : "border-black/10 bg-white/70"}`}
        >
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="mt-1 block text-[11px] leading-4 text-ink/45">
            {detail}
          </span>
        </button>
      ))}
    </div>
  );
}
