"use client";
import type { ReactNode } from "react";
import type { GroceryRequest } from "../../lib/groceries/client";
import { datedGroceries } from "../../lib/groceries/expiry";
import { useGroceryItems } from "./useGroceryItems";
import "./groceries.css";

export function GroceryExpiryPreview({ request, openGroceries }: { request: GroceryRequest; openGroceries: ReactNode }) {
  const { items, loading, error, reload } = useGroceryItems(request);
  const dated = datedGroceries(items);
  const due = dated.filter(row => row.days !== null && row.days <= 2);
  return <section className="grocery-expiry-preview" aria-label="Grocery dates before shopping">
    <header><h3>Check dates before shopping</h3>{openGroceries}</header>
    {error ? <p role="status">Grocery dates unavailable. <button onClick={() => void reload()}>Retry</button></p>
      : loading && !items.length ? <p role="status">Checking grocery dates…</p>
      : <>{due.slice(0, 3).map(({ item, label, tone }) => <div className="grocery-expiry-row" key={item.id}>
        <strong>{item.name}</strong><span className={"grocery-badge " + tone}>{label}</span>
      </div>)}
      {due.length > 3 ? <p>{due.length - 3} more to check in My groceries.</p> : null}
      {!due.length ? <p>{items.length ? "No recorded dates due within the next 2 days." : "Scan your groceries to see their dates here."}</p> : null}
      {dated.some(row => row.days === null) ? <p>Some products have no date set.</p> : null}
      {due.length ? <p>Review these dates when deciding what to buy and which meals to plan.</p> : null}
    </>}
  </section>;
}
