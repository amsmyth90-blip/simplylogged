type Choice = { id: string; label: string; symbol: string };

export const applianceChoices: Choice[] = [
  { id: "oven", label: "Oven", symbol: "▤" },
  { id: "hob", label: "Hob", symbol: "◎" },
  { id: "air fryer", label: "Air fryer", symbol: "◫" },
  { id: "slow cooker", label: "Slow cooker", symbol: "◒" },
  { id: "microwave", label: "Microwave", symbol: "▣" },
  { id: "barbecue", label: "Barbecue", symbol: "☼" },
];

export const shopChoices: Choice[] = [
  { id: "tesco", label: "Tesco", symbol: "T" },
  { id: "sainsburys", label: "Sainsbury's", symbol: "S" },
  { id: "asda", label: "Asda", symbol: "A" },
  { id: "aldi", label: "Aldi", symbol: "A" },
  { id: "lidl", label: "Lidl", symbol: "L" },
  { id: "morrisons", label: "Morrisons", symbol: "M" },
  { id: "waitrose", label: "Waitrose", symbol: "W" },
  { id: "ocado", label: "Ocado", symbol: "O" },
];

function ChoiceButton(props: { choice: Choice; selected: boolean; onToggle: () => void }) {
  return <button type="button" className={props.selected ? "is-selected" : ""}
    aria-pressed={props.selected} onClick={props.onToggle}>
    <i aria-hidden="true">{props.choice.symbol}</i><span>{props.choice.label}</span>
    <b aria-hidden="true">{props.selected ? "✓" : "+"}</b>
  </button>;
}

export function ApplianceVisual(props: { selected: string[]; onToggle: (id: string) => void }) {
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

export function ShopVisual(props: { selected: string[]; onToggle: (id: string) => void }) {
  return <><div className="smart-shop-scene" aria-hidden="true"><span>DiaryDock shopping</span>
    <div>{[...shopChoices, ...shopChoices].map((choice, index) =>
      <i key={`${choice.id}-${index}`}>{choice.label}</i>)}</div></div>
    <div className="smart-choice-grid shop-grid">{shopChoices.map((choice) =>
      <ChoiceButton key={choice.id} choice={choice} selected={props.selected.includes(choice.id)}
        onToggle={() => props.onToggle(choice.id)} />)}</div></>;
}
