import type { ReactNode } from "react";

import { UiIcon } from "@/components/UiIcon";
import type { ApplicabilityAnswer } from "@/lib/diarydock-data";

import { onboardingStepTitles } from "./onboarding-model";
import type { OnboardingViewModel } from "./useOnboarding";

export function OnboardingProgress({ view }: { view: OnboardingViewModel }) {
  return (
    <section
      className="estate-sheet p-4 sm:p-5"
      aria-label="Onboarding progress"
    >
      <div className="flex items-center gap-2">
        {onboardingStepTitles.map((title, index) => (
          <div key={title} className="min-w-0 flex-1">
            <div
              className={`h-1.5 rounded-full ${index <= view.step ? "bg-moss" : "bg-ink/10"}`}
            />
            <span className="sr-only">{title}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-ink/55">
        Step {view.step + 1} of {onboardingStepTitles.length} ·{" "}
        {onboardingStepTitles[view.step]}
      </p>
    </section>
  );
}

export function OnboardingNavigation({ view }: { view: OnboardingViewModel }) {
  const finalStep = view.step === onboardingStepTitles.length - 1;
  return (
    <div className="flex items-center gap-3 pb-4">
      {view.step > 0 ? (
        <button
          type="button"
          onClick={() => view.setStep((current) => current - 1)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-ink/15 bg-white/75 px-5 text-sm font-semibold text-ink"
        >
          <UiIcon name="arrow-left" className="h-4 w-4" /> Back
        </button>
      ) : null}
      <button
        type="button"
        disabled={!view.canContinue || view.saving}
        onClick={view.continueSetup}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        {view.saving ? "Saving securely…" : finalStep ? "Open my DiaryDock" : "Continue"}
        <UiIcon
          name={finalStep ? "check" : "chevron-right"}
          className="h-4 w-4"
        />
      </button>
    </div>
  );
}

export function LifeCheckQuestion({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{title}</legend>
      <p className="mt-1 text-xs leading-5 text-ink/50">{detail}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-10 rounded-xl border px-3 text-xs font-semibold ${selected ? "border-moss bg-moss text-white" : "border-black/10 bg-white/80 text-ink/60"}`}
    >
      {children}
    </button>
  );
}

export function YesNoChoices({
  value,
  onChange,
}: {
  value: ApplicabilityAnswer;
  onChange: (value: ApplicabilityAnswer) => void;
}) {
  return (
    <>
      <ChoiceButton selected={value === "yes"} onClick={() => onChange("yes")}>
        Yes
      </ChoiceButton>
      <ChoiceButton selected={value === "no"} onClick={() => onChange("no")}>
        No / not applicable
      </ChoiceButton>
    </>
  );
}
