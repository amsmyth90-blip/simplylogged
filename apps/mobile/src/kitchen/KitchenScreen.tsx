import type { KitchenItem, KitchenSnapshot } from "@diarydock/kitchen";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { MobileIcon } from "@mobile/components/MobileIcon";
import { PantryCaptureStage } from "./PantryCaptureStage";
import { PantryFlowStages } from "./PantryFlowStages";
import { useKitchen } from "./use-kitchen";
import { usePantryPlanner } from "./use-pantry-planner";

type KitchenScreenProps = {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenSnapshot;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
};

export function KitchenScreen(props: KitchenScreenProps) {
  const kitchen = useKitchen(props);
  const planner = usePantryPlanner({ accessToken: props.accessToken,
    mutate: kitchen.mutate, online: kitchen.online });

  function back() {
    if (planner.stage === "capture") { props.onBack(); return; }
    if (planner.stage === "meals") planner.setStage("confirm");
    else if (planner.stage === "shopping") planner.setStage("meals");
    else planner.setStage("capture");
  }

  function toggleIngredient(name: string) {
    const key = name.trim().toLocaleLowerCase("en-GB");
    planner.setConfirmed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleItem(item: KitchenItem) {
    void kitchen.mutate({ operation: "TOGGLE_ITEM", itemId: item.id });
  }

  async function addShoppingItem(name: string) {
    await kitchen.mutate({ operation: "ADD_ITEM", name, section: "Shopping" });
  }

  return <main className="pantry-screen">
    <div className="pantry-shell">
      <header className="pantry-header">
        <button type="button" onClick={back} aria-label="Back"><MobileIcon name="arrow-left" /></button>
        <div><small>Kitchen</small><h1>Pantry &amp; shopping</h1></div>
        <span className={kitchen.source === "NETWORK" ? "is-live" : "is-cached"}>
          {kitchen.source === "NETWORK" ? "Live" : "Offline"}</span>
      </header>
      {kitchen.loading && !kitchen.snapshot ? <p className="pantry-alert">Opening your Kitchen securely…</p> : null}
      {kitchen.message && planner.stage === "capture" ? <p className="pantry-alert" role="status">{kitchen.message}</p> : null}
      <PantryCaptureStage
        addItem={addShoppingItem}
        busy={kitchen.busy}
        captures={planner.captures.length}
        error={planner.error}
        items={kitchen.snapshot?.items ?? []}
        online={kitchen.online}
        previews={planner.previews}
        setCaptures={() => planner.setCaptures([])}
        onAddPhoto={(source) => void planner.add(source)}
        onAnalyse={() => void planner.analyse()}
        onToggle={toggleItem}
        stage={planner.stage}
      />
      <PantryFlowStages
        analysis={planner.analysis}
        confirmed={planner.confirmed}
        meal={planner.meal}
        selectedMeal={planner.selectedMeal}
        stage={planner.stage}
        onAddMissing={() => void planner.addMissing()}
        onConfirm={() => void planner.confirmStock()}
        onReset={planner.reset}
        onSelectMeal={planner.setSelectedMeal}
        onToggleIngredient={toggleIngredient}
      />
    </div>
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;
}
