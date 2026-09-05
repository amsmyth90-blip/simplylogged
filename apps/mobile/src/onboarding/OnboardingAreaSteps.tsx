import { estateAreas } from "@diarydock/home";
import { ADDITIONAL_DASHBOARD_AREAS } from "@diarydock/onboarding";

import type { OnboardingDraft } from "./onboarding-model";

export function AreasStep({ draft, toggle }: { draft: OnboardingDraft;
  toggle: (areaId: string) => void }) {
  return <section className="setup-stage">
    <p className="setup-eyebrow">Optional spaces</p><h2>Would you like anything else?</h2>
    <p>Your earlier answers selected the relevant areas. Add either of these if useful.</p>
    <div className="setup-areas">{ADDITIONAL_DASHBOARD_AREAS.map((question) => {
      const area = estateAreas.find(({ id }) => id === question.roomId);
      const selected = draft.selectedAreaIds.includes(question.roomId);
      return <button type="button" role="switch" aria-checked={selected} key={question.roomId}
        className={selected ? "selected" : ""} onClick={() => toggle(question.roomId)}>
        <span className="setup-area-icon">{area?.dashboardLabel?.slice(0, 1) ?? "•"}</span>
        <span><strong>{question.question}</strong><small>{question.detail}</small></span>
        <i><b /></i></button>;
    })}</div>
  </section>;
}

export function ReviewStep({ draft }: { draft: OnboardingDraft }) {
  const selected = estateAreas.filter(({ id }) => draft.selectedAreaIds.includes(id));
  return <section className="setup-review setup-card">
    <header><p className="setup-eyebrow">Ready to begin</p><h2>Your DiaryDock dashboard</h2>
      <p>We’ll show these {selected.length} areas. Hidden areas remain safe and can be added later.</p></header>
    <div>{selected.map((area) => <article key={area.id}><span>{area.dashboardLabel?.slice(0, 1)
      ?? area.name.slice(0, 1)}</span><strong>{area.dashboardLabel ?? area.name}</strong>
      <small>{area.domain}</small></article>)}</div>
    <p>Home, Documents, Inbox and Settings always remain available.</p>
  </section>;
}
