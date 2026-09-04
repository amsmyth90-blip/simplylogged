import type {
  GuardianDecision,
  GuardianFinding,
} from "@diarydock/guardian";

const labels: Record<GuardianFinding["severity"], string> = {
  INFO: "Coming up",
  ATTENTION: "Worth checking",
  IMPORTANT: "Needs attention",
  URGENT: "Recorded date passed",
};

export function GuardianFindingCard(props: {
  finding: GuardianFinding;
  online: boolean;
  onDecide: (decision: GuardianDecision) => void;
  onOpen: () => void;
}) {
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" })
    .format(new Date(props.finding.dueAt));
  return (
    <article className="guardian-card">
      <div className="guardian-card-meta">
        <span className={`guardian-severity severity-${props.finding.severity.toLowerCase()}`}>{labels[props.finding.severity]}</span>
        <time dateTime={props.finding.dueAt}>{date}</time>
      </div>
      <h2>{props.finding.title}</h2>
      <p>{props.finding.description}</p>
      <button type="button" className="guardian-source" onClick={props.onOpen}>Open the source <span>›</span></button>
      <div className="guardian-decisions">
        <button type="button" disabled={!props.online} onClick={() => props.onDecide("dismiss")}>Dismiss</button>
        <button type="button" disabled={!props.online} onClick={() => props.onDecide("snooze")}>7 days</button>
        <button type="button" disabled={!props.online} onClick={() => props.onDecide("resolve")}>Sorted</button>
      </div>
    </article>
  );
}
