import type { LifeCheckAnswers as Answers, LifeCheckField } from "@diarydock/life-check";

const questions: { field: Exclude<LifeCheckField, "homeTenure">; title: string }[] = [
  { field: "vehicles", title: "Vehicles" },
  { field: "pets", title: "Pets" },
  { field: "internationalTravel", title: "International travel" },
  { field: "householdCollaboration", title: "Household collaboration" },
  { field: "documentStorage", title: "Document storage" },
  { field: "reminders", title: "Reminders" },
];

function Choice(props: { selected: boolean; disabled: boolean; onClick: () => void; children: string }) {
  return <button type="button" className={props.selected ? "is-selected" : ""}
    aria-pressed={props.selected} disabled={props.disabled} onClick={props.onClick}>{props.children}</button>;
}

export function LifeCheckAnswers(props: { answers: Answers; disabled: boolean;
  onAnswer: (field: LifeCheckField, value: string) => void }) {
  return <section className="life-answer-card"><header><h2>What applies to you?</h2></header>
    <article><div><strong>Your home</strong></div>
      <div className="life-choices">{(["own", "rent", "other", "not-applicable"] as const).map((value) =>
        <Choice key={value} selected={props.answers.homeTenure === value} disabled={props.disabled}
          onClick={() => props.onAnswer("homeTenure", value)}>{value === "not-applicable"
            ? "Not applicable" : `${value[0]!.toUpperCase()}${value.slice(1)}`}</Choice>)}</div></article>
    {questions.map((question) => <article key={question.field}><div><strong>{question.title}</strong>
      </div><div className="life-choices">
        <Choice selected={props.answers[question.field] === "yes"} disabled={props.disabled}
          onClick={() => props.onAnswer(question.field, "yes")}>Yes</Choice>
        <Choice selected={props.answers[question.field] === "no"} disabled={props.disabled}
          onClick={() => props.onAnswer(question.field, "no")}>No</Choice>
      </div></article>)}
  </section>;
}
