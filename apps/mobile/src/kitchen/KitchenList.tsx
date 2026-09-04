import type { KitchenItem, KitchenSection } from "@diarydock/kitchen";

type KitchenListProps = {
  busy: boolean;
  items: KitchenItem[];
  online: boolean;
  section: KitchenSection;
  onDelete: (item: KitchenItem) => void;
  onMove: (item: KitchenItem) => void;
  onToggle: (item: KitchenItem) => void;
};

export function KitchenList(props: KitchenListProps) {
  const items = props.items.filter((item) => item.section === props.section);
  const other = props.section === "Pantry" ? "Shopping" : "Pantry";
  return (
    <section className="kitchen-list" aria-labelledby={`kitchen-${props.section.toLowerCase()}`}>
      <header>
        <div>
          <p>{props.section === "Pantry" ? "What you have" : "What you need"}</p>
          <h2 id={`kitchen-${props.section.toLowerCase()}`}>{props.section}</h2>
        </div>
        <span>{items.length}</span>
      </header>
      <div className="kitchen-items">
        {items.map((item) => (
          <article className={item.checked ? "is-checked" : ""} key={item.id}>
            <button
              className="kitchen-check"
              type="button"
              disabled={props.busy || !props.online}
              aria-label={`Mark ${item.name} ${item.checked ? "not complete" : "complete"}`}
              aria-pressed={item.checked}
              onClick={() => props.onToggle(item)}
            >{item.checked ? "✓" : ""}</button>
            <div><strong>{item.name}</strong><small>{item.checked ? "Complete" : "Open"}</small></div>
            <button
              className="kitchen-item-action"
              type="button"
              disabled={props.busy || !props.online}
              aria-label={`Move ${item.name} to ${other}`}
              onClick={() => props.onMove(item)}
            >↔</button>
            <button
              className="kitchen-item-action is-delete"
              type="button"
              disabled={props.busy || !props.online}
              aria-label={`Delete ${item.name}`}
              onClick={() => props.onDelete(item)}
            >×</button>
          </article>
        ))}
        {!items.length ? (
          <p className="kitchen-empty">
            {props.section === "Pantry" ? "Your pantry is ready for its first item." : "Your shopping list is clear."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
