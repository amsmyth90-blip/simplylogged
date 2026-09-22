import { useMemo } from "react";

import { GroceryScanner } from "@mobile/kitchen/GroceryScanner";
import { PreviewStore } from "./MobilePreview";

export function GroceryScannerPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return <main className="pantry-screen"><div className="pantry-shell">
    <header className="pantry-header"><button type="button" aria-label="Back to Pantry">‹</button>
      <div><small>Kitchen</small><h1>Groceries &amp; use-by dates</h1></div><span className="is-live">Live</span></header>
    <GroceryScanner accessToken="preview-access-token-that-is-never-sent" online store={store}
      synchronize={async () => undefined} onBack={() => undefined} onSavePantry={async () => true}
      initialGroceries={[
        { name: "Whole milk", date: "2026-09-25", dateType: "USE_BY", confidence: .98 },
        { name: "Chicken breasts", date: "2026-09-24", dateType: "USE_BY", confidence: .94 },
        { name: "Penne pasta", date: null, dateType: null, confidence: .87 },
      ]} />
  </div></main>;
}
