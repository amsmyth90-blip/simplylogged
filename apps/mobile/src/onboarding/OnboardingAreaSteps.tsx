import { estateAreas } from "@diarydock/home";
import { ADDITIONAL_DASHBOARD_AREAS } from "@diarydock/onboarding";

import type { OnboardingDraft } from "./onboarding-model";

export function AreasStep({ draft, toggle }: { draft: OnboardingDraft;
  toggle: (areaId: string) => void }) {
  return <section className="setup-stage">
    <h2>Extra areas</h2>
    <div className="setup-areas">{ADDITIONAL_DASHBOARD_AREAS.map((question) => {
      const area = estateAreas.find(({ id }) => id === question.roomId);
      const selected = draft.selectedAreaIds.includes(question.roomId);
      return <button type="button" role="switch" aria-checked={selected} key={question.roomId}
        className={selected ? "selected" : ""} onClick={() => toggle(question.roomId)}>
        <span className="setup-area-icon">{area?.dashboardLabel?.slice(0, 1) ?? "•"}</span>
        <span><strong>{question.question}</strong></span>
        <i><b /></i></button>;
    })}</div>
  </section>;
}

export function ReviewStep({ draft }: { draft: OnboardingDraft }) {
  const selected = estateAreas.filter(({ id }) => draft.selectedAreaIds.includes(id));
  return <section className="setup-review setup-card">
    <header><h2>Your home areas</h2></header>
    <div>{selected.map((area) => <article key={area.id}><span>{area.dashboardLabel?.slice(0, 1)
      ?? area.name.slice(0, 1)}</span><strong>{area.dashboardLabel ?? area.name}</strong>
      <small>{area.domain}</small></article>)}</div>
  </section>;
}
