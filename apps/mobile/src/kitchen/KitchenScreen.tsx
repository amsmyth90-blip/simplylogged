import { useState, type FormEvent } from "react";

import type { KitchenItem, KitchenSection, KitchenSnapshot } from "@diarydock/kitchen";
import type { OfflineStore } from "@diarydock/offline-store";

import kitchenImage from "../../../../public/images/kitchen-command-centre.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { KitchenList } from "./KitchenList";
import { useKitchen } from "./use-kitchen";

type KitchenScreenProps = {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenSnapshot;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onOpenMealPlanner: () => void;
  onOpenNoticeboard: () => void;
  onOpenRecipes: () => void;
};

export function KitchenScreen(props: KitchenScreenProps) {
  const kitchen = useKitchen(props);
  const [section, setSection] = useState<KitchenSection>("Shopping");
  const [name, setName] = useState("");

  async function addItem(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (await kitchen.mutate({ operation: "ADD_ITEM", name, section })) setName("");
  }

  function move(item: KitchenItem) {
    void kitchen.mutate({
      operation: "MOVE_ITEM",
      itemId: item.id,
      section: item.section === "Pantry" ? "Shopping" : "Pantry",
    });
  }

  function remove(item: KitchenItem) {
    if (!window.confirm(`Remove ${item.name} from ${item.section}?`)) return;
    void kitchen.mutate({ operation: "DELETE_ITEM", itemId: item.id });
  }

  return (
    <main className="kitchen-screen">
      <header className="kitchen-header">
        <button type="button" onClick={props.onBack} aria-label="Back to the Kitchen room">‹</button>
        <div><strong>Kitchen</strong><small>Pantry & shopping</small></div>
        <span className={kitchen.source === "NETWORK" ? "is-live" : "is-cached"}>
          {kitchen.source === "NETWORK" ? "Live" : "Offline copy"}
        </span>
      </header>

      <section className="kitchen-hero" style={{ backgroundImage: `url(${kitchenImage})` }}>
        <div />
        <article>
          <p>Everyday kitchen</p>
          <h1>Pantry & shopping</h1>
          <span>Know what is at home and what to pick up next.</span>
        </article>
      </section>

      <section className="kitchen-sheet">
        <div className="kitchen-feature-links">
          <button type="button" className="kitchen-noticeboard-link" onClick={props.onOpenRecipes}>
            <span>R</span><div><strong>Family recipes</strong>
              <small>Save favourites and cook step by step</small></div><b>›</b></button>
          <button type="button" className="kitchen-noticeboard-link" onClick={props.onOpenMealPlanner}>
            <span>7</span><div><strong>Weekly meal planner</strong>
              <small>Plan meals and build the shopping list</small></div><b>›</b></button>
          <button type="button" className="kitchen-noticeboard-link" onClick={props.onOpenNoticeboard}>
            <span>▦</span><div><strong>Family noticeboard</strong>
              <small>Pin household notes, plans and reminders</small></div><b>›</b></button>
        </div>
        <form className="kitchen-add" onSubmit={(event) => void addItem(event)}>
          <label htmlFor="kitchen-item-name">Add an item</label>
          <div>
            <input
              id="kitchen-item-name"
              value={name}
              maxLength={120}
              disabled={kitchen.busy || !kitchen.online}
              placeholder={kitchen.online ? `Add to ${section.toLowerCase()}` : "Connect to add an item"}
              onChange={(event) => setName(event.target.value)}
            />
            <button type="submit" disabled={kitchen.busy || !kitchen.online || !name.trim()}>Add</button>
          </div>
        </form>

        <div className="kitchen-tabs" role="tablist" aria-label="Kitchen lists">
          {(["Shopping", "Pantry"] as const).map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={section === item}
              className={section === item ? "is-active" : ""}
              onClick={() => setSection(item)}
              key={item}
            >{item}<span>{kitchen.snapshot?.items.filter((entry) => entry.section === item).length ?? 0}</span></button>
          ))}
        </div>

        {kitchen.message ? <p className="kitchen-message" role="status">{kitchen.message}</p> : null}
        {kitchen.loading && !kitchen.snapshot ? <p className="kitchen-loading">Opening your Kitchen securely…</p> : null}
        {kitchen.snapshot ? (
          <div className="kitchen-list-grid">
            <KitchenList
              busy={kitchen.busy}
              items={kitchen.snapshot.items}
              online={kitchen.online}
              section={section}
              onDelete={remove}
              onMove={move}
              onToggle={(item) => void kitchen.mutate({ operation: "TOGGLE_ITEM", itemId: item.id })}
            />
            <KitchenList
              busy={kitchen.busy}
              items={kitchen.snapshot.items}
              online={kitchen.online}
              section={section === "Pantry" ? "Shopping" : "Pantry"}
              onDelete={remove}
              onMove={move}
              onToggle={(item) => void kitchen.mutate({ operation: "TOGGLE_ITEM", itemId: item.id })}
            />
          </div>
        ) : null}
      </section>
      <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
    </main>
  );
}
