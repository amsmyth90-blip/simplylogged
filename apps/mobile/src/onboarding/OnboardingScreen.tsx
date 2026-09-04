import { useState } from "react";

import type { HouseholdChoice, OnboardingAnswers } from "@diarydock/onboarding";

import estateImage from "../../../../public/images/estate-dashboard-country.webp";
import { AreasStep, ReviewStep } from "./OnboardingAreaSteps";
import { SetupNavigation, SetupProgress } from "./OnboardingControls";
import { LifeStep, PreferencesStep } from "./OnboardingLifeSteps";
import {
  answerDraft,
  draftFromSnapshot,
  householdDraft,
  onboardingStepTitles,
  stepIsComplete,
  toggleDraftArea,
} from "./onboarding-model";
import { HouseholdStep, ProfileStep } from "./OnboardingProfileSteps";
import type { MobileOnboardingModel } from "./use-mobile-onboarding";

function SetupUnavailable({ model, onSignOut }: { model: MobileOnboardingModel;
  onSignOut: () => void }) {
  return <main className="setup-screen setup-unavailable">
    <div className="setup-unavailable-image" style={{ backgroundImage: `url(${estateImage})` }} />
    <section className="setup-card"><p className="setup-eyebrow">Private setup</p>
      <h1>{model.loading ? "Preparing your DiaryDock…" : "Connect to continue"}</h1>
      <p>{model.message ?? "Your setup could not be opened safely."}</p>
      {!model.loading ? <button type="button" onClick={() => void model.refresh()}>Try again</button> : null}
      <button type="button" className="quiet" onClick={onSignOut}>Sign out</button></section>
  </main>;
}

function SetupForm({ model, onBack, onComplete }: { model: MobileOnboardingModel;
  onBack?: () => void; onComplete: () => void }) {
  const snapshot = model.snapshot!;
  const [draft, setDraft] = useState(() => draftFromSnapshot(snapshot));
  const [step, setStep] = useState(0);
  const finalStep = step === onboardingStepTitles.length - 1;
  const answer = (field: keyof OnboardingAnswers, value: string) =>
    setDraft((current) => answerDraft(current, field, value));
  const choose = (value: HouseholdChoice) => setDraft((current) => householdDraft(current, value));
  const toggle = (areaId: string) => setDraft((current) => toggleDraftArea(current, areaId));

  async function continueSetup() {
    if (!finalStep) { setStep((current) => current + 1); return; }
    if (!draft.householdMembers) return;
    const saved = await model.save({ ...draft, profileName: draft.profileName.trim(),
      householdName: draft.householdName.trim(), householdMembers: draft.householdMembers });
    if (saved) onComplete();
  }

  return <main className="setup-screen">
    <header className="setup-hero" style={{ backgroundImage: `url(${estateImage})` }}>
      {onBack ? <button type="button" onClick={onBack} aria-label="Back to Settings">‹</button> : null}
      <div><p>Welcome to DiaryDock</p><h1>Let’s make it yours</h1>
        <span>A few simple questions create a calmer dashboard. Nothing is permanent.</span></div>
      <b>🔒 Private setup</b>
    </header>
    <div className="setup-content"><SetupProgress step={step} />
      {step === 0 ? <ProfileStep draft={draft} setDraft={setDraft} /> : null}
      {step === 1 ? <HouseholdStep draft={draft} choose={choose} /> : null}
      {step === 2 ? <LifeStep draft={draft} answer={answer} /> : null}
      {step === 3 ? <PreferencesStep draft={draft} answer={answer} /> : null}
      {step === 4 ? <AreasStep draft={draft} toggle={toggle} /> : null}
      {step === 5 ? <ReviewStep draft={draft} /> : null}
      {model.message ? <p className="setup-message" role="status">{model.message}</p> : null}
      {!model.online ? <p className="setup-message">You can review your choices offline. Connect to save them.</p> : null}
      <SetupNavigation busy={model.busy} canContinue={stepIsComplete(step, draft)}
        finalStep={finalStep} online={model.online} onBack={() => setStep((current) => current - 1)}
        onContinue={() => void continueSetup()} step={step} />
    </div>
  </main>;
}

export function OnboardingScreen({ model, onBack, onComplete, onSignOut }: {
  model: MobileOnboardingModel; onBack?: () => void; onComplete: () => void; onSignOut: () => void }) {
  if (!model.snapshot) return <SetupUnavailable model={model} onSignOut={onSignOut} />;
  return <SetupForm key={model.snapshot.revision ?? "new"} model={model}
    onBack={onBack} onComplete={onComplete} />;
}
