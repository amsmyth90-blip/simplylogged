import type { OnboardingAnswers } from "@diarydock/onboarding";

import { SetupChoice, YesNoChoice } from "./OnboardingControls";
import type { OnboardingDraft } from "./onboarding-model";

function Question({ children, detail, title }: { children: React.ReactNode;
  detail: string; title: string }) {
  return <fieldset><legend>{title}</legend><p>{detail}</p>{children}</fieldset>;
}

export function LifeStep({ draft, answer }: { draft: OnboardingDraft;
  answer: (field: keyof OnboardingAnswers, value: string) => void }) {
  return <section className="setup-stage">
    <p className="setup-eyebrow">Your life</p><h2>What applies to you?</h2>
    <p>Choosing no excludes an area rather than counting it as missing.</p>
    <div className="setup-card setup-questions">
      <Question title="Your home" detail="Which best describes your current home?">
        <div className="setup-answers">{(["own", "rent", "other", "not-applicable"] as const)
          .map((value) => <SetupChoice key={value} selected={draft.answers.homeTenure === value}
            onClick={() => answer("homeTenure", value)}>{value === "not-applicable"
              ? "Not applicable" : `${value[0]!.toUpperCase()}${value.slice(1)}`}</SetupChoice>)}</div>
      </Question>
      <Question title="Vehicles" detail="Do you own or regularly manage a vehicle?">
        <YesNoChoice value={draft.answers.vehicles} onChange={(value) => answer("vehicles", value)} />
      </Question>
      <Question title="Pets" detail="Do you have pet records or care to organise?">
        <YesNoChoice value={draft.answers.pets} onChange={(value) => answer("pets", value)} />
      </Question>
      <Question title="International travel" detail="Do you organise passports, cover or overseas trips?">
        <YesNoChoice value={draft.answers.internationalTravel}
          onChange={(value) => answer("internationalTravel", value)} />
      </Question>
    </div>
  </section>;
}
