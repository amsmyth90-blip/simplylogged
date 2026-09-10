import { householdChoices, type HouseholdChoice } from "@diarydock/onboarding";

import { SetupChoice } from "./OnboardingControls";
import type { OnboardingDraft } from "./onboarding-model";

export function ProfileStep({ draft, setDraft }: { draft: OnboardingDraft;
  setDraft: (value: OnboardingDraft) => void }) {
  return <section className="setup-card setup-profile">
    <h2>Your details</h2>
    <label><span>Name</span><input autoComplete="name" maxLength={160}
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
    <h2>Who lives in your home?</h2>
    <p>This does not give anyone access.</p>
    <div className="setup-households">{householdChoices.map((choice) =>
      <SetupChoice key={choice.value} selected={draft.householdMembers === choice.value}
        onClick={() => choose(choice.value)}><span className="setup-choice-icon">⌂</span>
        <span><strong>{choice.title}</strong><small>{choice.detail}</small></span>
        <b>{draft.householdMembers === choice.value ? "✓" : ""}</b></SetupChoice>)}</div>
  </section>;
}
