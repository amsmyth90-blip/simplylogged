import { UiIcon, type IconName } from "@/components/UiIcon";

import { householdChoices } from "./onboarding-model";
import type { OnboardingViewModel } from "./useOnboarding";

export function ProfileStep({ view }: { view: OnboardingViewModel }) {
  return (
    <section className="estate-sheet p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c67a5]">
        Start with you
      </p>
      <h1 className="mt-2 font-serif text-3xl text-[#123f34]">
        What should we call you?
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#55756c]">
        These details personalise your app and can be changed later.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[#153f35]">Your name</span>
          <input
            value={view.state.settingsProfile.name}
            onChange={(event) => view.updateProfile("name", event.target.value)}
            placeholder="e.g. Amy Smyth"
            autoComplete="name"
            className="w-full rounded-2xl border border-[#bdd7ce] bg-white px-4 py-3 text-base text-[#153f35] outline-none transition focus:border-[#087a59] focus:ring-4 focus:ring-[#087a59]/10"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[#153f35]">Household name</span>
          <input
            value={view.onboarding.householdName}
            onChange={(event) =>
              view.updateProfile("householdName", event.target.value)
            }
            placeholder="e.g. The Smyth household"
            className="w-full rounded-2xl border border-[#bdd7ce] bg-white px-4 py-3 text-base text-[#153f35] outline-none transition focus:border-[#087a59] focus:ring-4 focus:ring-[#087a59]/10"
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c67a5]">
          Your household
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[#123f34]">
          Who shares your home?
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#55756c]">
          We’ll tailor shared spaces to the people you organise life with.
          This does not give anyone access.
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
              className={`estate-sheet flex min-h-24 items-center gap-4 p-4 text-left transition ${selected ? "!border-[#087a59] !bg-[#087a59] !text-white" : "hover:-translate-y-0.5 hover:border-[#8ab9a9]"}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected ? "bg-white/15 text-white" : "bg-[#def0e9] text-[#087a59]"}`}
              >
                <UiIcon name={choice.icon as IconName} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${selected ? "text-white" : "text-[#153f35]"}`}>
                  {choice.title}
                </span>
                <span className={`mt-1 block text-xs leading-5 ${selected ? "text-white/75" : "text-[#55756c]"}`}>
                  {choice.detail}
                </span>
              </span>
              {selected ? (
                <UiIcon name="check" className="h-5 w-5 text-white" />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
