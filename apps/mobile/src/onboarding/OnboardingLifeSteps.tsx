import type { OnboardingAnswers } from "@diarydock/onboarding";

import { SetupChoice, YesNoChoice } from "./OnboardingControls";
import type { OnboardingDraft } from "./onboarding-model";

function Question({ children, question }: { children: React.ReactNode; question: string }) {
  return <fieldset><legend>{question}</legend>{children}</fieldset>;
}

export function LifeStep({ draft, answer }: { draft: OnboardingDraft;
  answer: (field: keyof OnboardingAnswers, value: string) => void }) {
  return <section className="setup-stage">
    <h2>What applies to you?</h2>
    <div className="setup-card setup-questions">
      <Question question="Which best describes your home?">
        <div className="setup-answers">{(["own", "rent", "other", "not-applicable"] as const)
          .map((value) => <SetupChoice key={value} selected={draft.answers.homeTenure === value}
            onClick={() => answer("homeTenure", value)}>{value === "not-applicable"
              ? "Not applicable" : `${value[0]!.toUpperCase()}${value.slice(1)}`}</SetupChoice>)}</div>
      </Question>
      <Question question="Do you manage a vehicle?">
        <YesNoChoice value={draft.answers.vehicles} onChange={(value) => answer("vehicles", value)} />
      </Question>
      <Question question="Do you have pets?">
        <YesNoChoice value={draft.answers.pets} onChange={(value) => answer("pets", value)} />
      </Question>
      <Question question="Do you travel abroad?">
        <YesNoChoice value={draft.answers.internationalTravel}
          onChange={(value) => answer("internationalTravel", value)} />
      </Question>
    </div>
  </section>;
}
