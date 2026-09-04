import type { LifeCheckAnswers as Answers, LifeCheckField } from "@diarydock/life-check";

const questions: { field: Exclude<LifeCheckField, "homeTenure">; title: string; detail: string }[] = [
  { field: "vehicles", title: "Vehicles", detail: "A vehicle you own or regularly manage" },
  { field: "pets", title: "Pets", detail: "Pet records, cover or care" },
  { field: "internationalTravel", title: "International travel", detail: "Passports, cover or overseas trips" },
  { field: "householdCollaboration", title: "Household collaboration", detail: "Organising things with another person" },
  { field: "documentStorage", title: "Private document storage", detail: "Keeping important files in DiaryDock" },
  { field: "reminders", title: "Reminders", detail: "Keeping useful dates in view" },
];

function Choice(props: { selected: boolean; disabled: boolean; onClick: () => void; children: string }) {
  return <button type="button" className={props.selected ? "is-selected" : ""}
    aria-pressed={props.selected} disabled={props.disabled} onClick={props.onClick}>{props.children}</button>;
}

export function LifeCheckAnswers(props: { answers: Answers; disabled: boolean;
  onAnswer: (field: LifeCheckField, value: string) => void }) {
  return <section className="life-answer-card"><header><small>Your personal setup</small>
    <h2>What applies to you?</h2><p>Change these whenever life changes. “No” removes that category from the score.</p></header>
    <article><div><strong>Your home</strong><span>Which best describes your current home?</span></div>
      <div className="life-choices">{(["own", "rent", "other", "not-applicable"] as const).map((value) =>
        <Choice key={value} selected={props.answers.homeTenure === value} disabled={props.disabled}
          onClick={() => props.onAnswer("homeTenure", value)}>{value === "not-applicable"
            ? "Not applicable" : `${value[0]!.toUpperCase()}${value.slice(1)}`}</Choice>)}</div></article>
    {questions.map((question) => <article key={question.field}><div><strong>{question.title}</strong>
      <span>{question.detail}</span></div><div className="life-choices">
        <Choice selected={props.answers[question.field] === "yes"} disabled={props.disabled}
          onClick={() => props.onAnswer(question.field, "yes")}>Yes</Choice>
        <Choice selected={props.answers[question.field] === "no"} disabled={props.disabled}
          onClick={() => props.onAnswer(question.field, "no")}>No</Choice>
      </div></article>)}
  </section>;
}
