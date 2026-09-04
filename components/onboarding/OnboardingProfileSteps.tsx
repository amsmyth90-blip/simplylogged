import { UiIcon, type IconName } from "@/components/UiIcon";

import { householdChoices } from "./onboarding-model";
import type { OnboardingViewModel } from "./useOnboarding";

export function ProfileStep({ view }: { view: OnboardingViewModel }) {
  return (
    <section className="estate-sheet p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
        Start with you
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">
        What should we call you?
      </h1>
      <p className="mt-2 text-sm leading-6 text-ink/55">
        These details personalise your app and can be changed later.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Your name</span>
          <input
            value={view.state.settingsProfile.name}
            onChange={(event) => view.updateProfile("name", event.target.value)}
            placeholder="e.g. Amy Smyth"
            autoComplete="name"
            className="w-full rounded-2xl border border-black/10 bg-white/85 px-4 py-3 text-base text-ink outline-none focus:border-moss"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">Household name</span>
          <input
            value={view.onboarding.householdName}
            onChange={(event) =>
              view.updateProfile("householdName", event.target.value)
            }
            placeholder="e.g. The Smyth household"
            className="w-full rounded-2xl border border-black/10 bg-white/85 px-4 py-3 text-base text-ink outline-none focus:border-moss"
          />
        </label>
      </div>
    </section>
  );
}

export function HouseholdStep({ view }: { view: OnboardingViewModel }) {
  return (
    <section className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
          Your household
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Who is DiaryDock for?
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink/55">
          This helps us recommend the right areas. It does not give anyone
          access.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {householdChoices.map((choice) => {
          const selected = view.onboarding.householdMembers === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => view.chooseHousehold(choice.value)}
              aria-pressed={selected}
              className={`estate-sheet flex min-h-24 items-center gap-4 p-4 text-left transition ${selected ? "ring-2 ring-moss/55" : "hover:-translate-y-0.5"}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-moss text-white" : "bg-sage/60 text-moss"}`}
              >
                <UiIcon name={choice.icon as IconName} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {choice.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-ink/55">
                  {choice.detail}
                </span>
              </span>
              {selected ? (
                <UiIcon name="check" className="h-5 w-5 text-moss" />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
