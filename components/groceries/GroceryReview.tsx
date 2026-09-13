"use client";
import type { GroceryDraft } from "../../lib/groceries/model";
export function GroceryReview({items,onChange,locked}:{items:GroceryDraft[];onChange:(items:GroceryDraft[])=>void;locked:boolean}) {
  const change=(id:string,patch:Partial<GroceryDraft>)=>onChange(items.map(item=>item.id===id?{...item,...patch}:item));
  return <div className="grocery-review">{items.map((item,index)=><article key={item.id}>
    <header><strong>Product {index+1}</strong><button type="button" disabled={locked} onClick={()=>onChange(items.filter(row=>row.id!==item.id))}>Remove</button></header>
    <label>Product name<input value={item.name} maxLength={120} disabled={locked} onChange={e=>change(item.id,{name:e.target.value})}/></label>
    <label>Quantity / pack size<input value={item.quantity} maxLength={80} disabled={locked} onChange={e=>change(item.id,{quantity:e.target.value})}/></label>
    <div className="grocery-fields"><label>Date label<select value={item.dateType} disabled={locked} onChange={e=>change(item.id,{dateType:e.target.value as GroceryDraft["dateType"]})}>
      <option value="unknown">Not identified</option><option value="use-by">Use by</option><option value="best-before">Best before</option>
    </select></label><label>Full date<input type="date" value={item.date} disabled={locked} onChange={e=>change(item.id,{date:e.target.value})}/></label></div>
    {item.dateText?<p>Read from label: <strong>{item.dateText}</strong></p>:null}
    {!item.date?<p className="grocery-warning">Check the date with a close-up or enter it here. Saving without a date creates no expiry reminders.</p>:null}
  </article>)}</div>;
}
