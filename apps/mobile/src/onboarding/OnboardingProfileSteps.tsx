import { householdChoices, type HouseholdChoice } from "@diarydock/onboarding";

import { SetupChoice } from "./OnboardingControls";
import type { OnboardingDraft } from "./onboarding-model";

export function ProfileStep({ draft, setDraft }: { draft: OnboardingDraft;
  setDraft: (value: OnboardingDraft) => void }) {
  return <section className="setup-card setup-profile">
    <p className="setup-eyebrow">Start with you</p><h2>What should we call you?</h2>
    <p>These details personalise your app and can be changed later.</p>
    <label><span>Your name</span><input autoComplete="name" maxLength={160}
      placeholder="e.g. Amy Smyth" value={draft.profileName}
      onChange={(event) => setDraft({ ...draft, profileName: event.target.value })} /></label>
    <label><span>Household name</span><input maxLength={160}
      placeholder="e.g. The Smyth household" value={draft.householdName}
      onChange={(event) => setDraft({ ...draft, householdName: event.target.value })} /></label>
  </section>;
}

export function HouseholdStep({ draft, choose }: { draft: OnboardingDraft;
  choose: (value: HouseholdChoice) => void }) {
  return <section className="setup-stage">
    <p className="setup-eyebrow">Your household</p><h2>Who is DiaryDock for?</h2>
    <p>This recommends useful areas. It does not give anyone access.</p>
    <div className="setup-households">{householdChoices.map((choice) =>
      <SetupChoice key={choice.value} selected={draft.householdMembers === choice.value}
        onClick={() => choose(choice.value)}><span className="setup-choice-icon">⌂</span>
        <span><strong>{choice.title}</strong><small>{choice.detail}</small></span>
        <b>{draft.householdMembers === choice.value ? "✓" : ""}</b></SetupChoice>)}</div>
  </section>;
}
