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
    </div>
  </section>;
}

const preferenceQuestions = [
  ["internationalTravel", "International travel", "Organise passports, cover or overseas trips?"],
  ["householdCollaboration", "Household collaboration", "Organise some things with another person?"],
  ["documentStorage", "Private document storage", "Keep important files securely in DiaryDock?"],
  ["reminders", "Reminders", "Keep useful dates and actions in view?"],
] as const;

export function PreferencesStep({ draft, answer }: { draft: OnboardingDraft;
  answer: (field: keyof OnboardingAnswers, value: string) => void }) {
  return <section className="setup-stage">
    <p className="setup-eyebrow">Your preferences</p><h2>How can DiaryDock help?</h2>
    <p>These choices personalise your checklist. They do not share anything or enable notifications.</p>
    <div className="setup-card setup-questions">{preferenceQuestions.map(([field, title, detail]) =>
      <Question key={field} title={title} detail={detail}><YesNoChoice value={draft.answers[field]}
        onChange={(value) => answer(field, value)} /></Question>)}</div>
  </section>;
}
