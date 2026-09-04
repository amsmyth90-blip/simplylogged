import type { ReactNode } from "react";

import { onboardingStepTitles } from "./onboarding-model";

export function SetupProgress({ step }: { step: number }) {
  return <div className="setup-progress" aria-label="Setup progress">
    <div>{onboardingStepTitles.map((title, index) => <span key={title}
      className={index <= step ? "active" : ""}><i /><b>{title}</b></span>)}</div>
    <p>Step {step + 1} of {onboardingStepTitles.length} · {onboardingStepTitles[step]}</p>
  </div>;
}

export function SetupChoice({ children, selected, onClick }: {
  children: ReactNode; selected: boolean; onClick: () => void }) {
  return <button type="button" className={`setup-choice ${selected ? "selected" : ""}`}
    aria-pressed={selected} onClick={onClick}>{children}</button>;
}

export function YesNoChoice({ value, onChange }: {
  value: string; onChange: (value: "yes" | "no") => void }) {
  return <div className="setup-answers">
    <SetupChoice selected={value === "yes"} onClick={() => onChange("yes")}>Yes</SetupChoice>
    <SetupChoice selected={value === "no"} onClick={() => onChange("no")}>No / not applicable</SetupChoice>
  </div>;
}

export function SetupNavigation({ busy, canContinue, finalStep, online, onBack, onContinue,
  step }: { busy: boolean; canContinue: boolean; finalStep: boolean; online: boolean;
    onBack: () => void; onContinue: () => void; step: number }) {
  const disabled = busy || !canContinue || (finalStep && !online);
  return <footer className="setup-navigation">
    {step > 0 ? <button type="button" onClick={onBack}>‹ Back</button> : null}
    <button type="button" className="primary" disabled={disabled} onClick={onContinue}>
      {busy ? "Saving…" : finalStep ? "Open my DiaryDock" : "Continue"}
    </button>
  </footer>;
}
