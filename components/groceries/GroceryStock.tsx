"use client";
import { useState } from "react";
import type { GroceryItem } from "../../lib/groceries/model";
import { datedGroceries } from "../../lib/groceries/expiry";

export function GroceryStock({ items, busy, loading, error, onRetry, onUsed, onScan }: {
  items: GroceryItem[]; busy: boolean; loading: boolean; error: string;
  onRetry: () => void; onUsed: (id: string) => void; onScan: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const rows = datedGroceries(items).filter(row => row.item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    && (filter === "all" || (filter === "soon" ? row.days !== null && row.days >= 0 && row.days <= 2
      : filter === "past" ? row.days !== null && row.days < 0 : row.days === null)));
  const pages = Math.max(1, Math.ceil(rows.length / 5));
  const current = Math.min(page, pages - 1);
  return <section className="grocery-stock">
    <div className="grocery-stock-heading"><h2>Products &amp; expiry dates</h2>
      <button className="grocery-primary" onClick={onScan} disabled={busy}>+ Scan shopping</button></div>
    {error ? <p role="alert">{error} <button onClick={onRetry}>Retry</button></p> : null}
    {loading && !items.length ? <p role="status">Loading your groceries…</p> : null}
    {items.length ? <>
      <div className="grocery-search"><input aria-label="Find a product" placeholder="Find a product" value={query}
        onChange={event => { setQuery(event.target.value); setPage(0); }} />
        <select aria-label="Filter expiry dates" value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}>
          <option value="all">All products</option><option value="soon">Due within 2 days</option>
          <option value="past">Date passed</option><option value="undated">No date set</option>
        </select></div>
      {rows.slice(current * 5, current * 5 + 5).map(({ item, label, tone }) => <article key={item.id}>
        <div><strong>{item.name}</strong><p>{item.quantity}</p>
          <span className={"grocery-badge " + tone}>{label}</span>
          {item.date ? <p>{new Date(item.date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p> : null}
        </div><button disabled={busy} onClick={() => onUsed(item.id)}>Used up</button>
      </article>)}
      {!rows.length ? <p>No products match this filter.</p> : null}
      {pages > 1 ? <nav aria-label="Grocery pages"><button disabled={!current} onClick={() => setPage(current - 1)}>Previous</button>
        <span>{current + 1} / {pages}</span><button disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>Next</button></nav> : null}
    </> : !loading && !error ? <div className="grocery-empty"><p>Your saved products and dates will appear here.</p>
      <p>Start with a photo, a short video or add an item yourself.</p></div> : null}
  </section>;
}
