import type { KitchenAppliance } from "@diarydock/kitchen";

type Choice = { id: string; label: string; symbol: string };

export const applianceChoices: Array<Choice & { id: KitchenAppliance }> = [
  { id: "oven", label: "Oven", symbol: "▤" },
  { id: "hob", label: "Hob", symbol: "◎" },
  { id: "air fryer", label: "Air fryer", symbol: "◫" },
  { id: "slow cooker", label: "Slow cooker", symbol: "◒" },
  { id: "microwave", label: "Microwave", symbol: "▣" },
  { id: "barbecue", label: "Barbecue", symbol: "☼" },
];

function ChoiceButton(props: { choice: Choice; selected: boolean; onToggle: () => void }) {
  return <button type="button" className={props.selected ? "is-selected" : ""}
    aria-pressed={props.selected} onClick={props.onToggle}>
    <i aria-hidden="true">{props.choice.symbol}</i><span>{props.choice.label}</span>
    <b aria-hidden="true">{props.selected ? "✓" : "+"}</b>
  </button>;
}

export function ApplianceVisual(props: {
  selected: KitchenAppliance[];
  onToggle: (id: KitchenAppliance) => void;
}) {
  return <><div className="smart-kitchen-scene" aria-hidden="true">
    <span className="smart-window"><i /><i /><i /></span><span className="smart-pendant" />
    <span className="smart-counter"><i /><b /></span>
    {applianceChoices.slice(0, 4).map((choice, index) => <span key={choice.id}
      className={`smart-scene-appliance appliance-${index} ${props.selected.includes(choice.id)
        ? "is-on" : ""}`}>{choice.symbol}</span>)}
  </div><div className="smart-choice-grid appliance-grid">
    {applianceChoices.map((choice) => <ChoiceButton key={choice.id} choice={choice}
      selected={props.selected.includes(choice.id)} onToggle={() => props.onToggle(choice.id)} />)}
  </div></>;
}
