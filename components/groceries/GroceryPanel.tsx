"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseCommand, type GroceryDraft, type GroceryItem, type GroceryCommand } from "../../lib/groceries/model";
import { groceryFrames } from "../../lib/groceries/media";
import { GroceryRequestError, type GroceryRequest } from "../../lib/groceries/client";
import { GroceryReview } from "./GroceryReview";
import "./groceries.css";
export function GroceryPanel({request,takePhoto,enablePush,onReminders}:{
  request:GroceryRequest;takePhoto?:()=>Promise<File|null>;enablePush?:()=>Promise<boolean>;onReminders:()=>void;
}) {
  const [items,setItems]=useState<GroceryItem[]>([]),[drafts,setDrafts]=useState<GroceryDraft[]>([]);
  const [frames,setFrames]=useState<File[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [confirmed,setConfirmed]=useState(false),[page,setPage]=useState(0);
  const [pending,setPending]=useState<GroceryCommand|null>(null);
  const camera=useRef<HTMLInputElement>(null),video=useRef<HTMLInputElement>(null),library=useRef<HTMLInputElement>(null);
  const load=useCallback(async()=>{const data=await request("GET");setItems((data.items??[]) as GroceryItem[]);},[request]);
  useEffect(()=>{void load().catch(e=>setMessage(e.message));},[load]);
  const edit=(rows:GroceryDraft[])=>{setDrafts(rows);setConfirmed(false);};
  async function prepare(files:File[]) {
    if(!files.length)return;setBusy(true);setMessage("");
    try { const next=await groceryFrames(files);if(frames.length+next.length>12)throw Error("Read these labels before adding more photos.");
      setFrames(current=>[...current,...next]); }
    catch(e){setMessage(e instanceof Error?e.message:"Capture failed.");}finally{setBusy(false);}
  }
  async function photo() {
    if(!takePhoto){camera.current?.click();return;}
    try{const file=await takePhoto();if(file)await prepare([file]);}catch{setMessage("The camera could not open. Choose a photo instead.");}
  }
  async function read() {
    setBusy(true);setMessage("");
    try {const form=new FormData();frames.forEach(file=>form.append("files",file));
      const result=await request("POST",form);
      if(drafts.length+(result.items?.length??0)>40)throw Error("Save or remove some reviewed products before reading more labels (40 per batch).");
      edit([...drafts,...(result.items??[]) as GroceryDraft[]]);setFrames([]);
      if(!result.items?.length)setMessage("No products were readable. Try a closer photo or enter them manually.");
    }catch(e){setMessage(e instanceof Error?e.message:"Labels could not be read.");}finally{setBusy(false);}
  }
  async function save() {
    setBusy(true);setMessage("");
    try {
      const command=pending??parseCommand({operation:"SAVE",batchId:crypto.randomUUID(),confirmed,
        timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,items:drafts});
      setPending(command);await request("POST",command);setPending(null);setDrafts([]);setFrames([]);setConfirmed(false);
      setMessage("Groceries saved. Reminders are set for confirmed dates with future reminder times.");await load();
    }catch(e){
      if(e instanceof GroceryRequestError && e.status===400)setPending(null);
      setMessage(e instanceof Error?e.message:"Save failed. Retry with the same details.");}finally{setBusy(false);}
  }
  async function used(id:string) {
    setBusy(true);setMessage("");
    try{await request("POST",{operation:"USE",id});await load();setMessage("Marked used up. Remaining reminders cancelled.");}
    catch(e){setMessage(e instanceof Error?e.message:"Please retry.");}finally{setBusy(false);}
  }
  const locked=busy||Boolean(pending);
  const pages=Math.max(1,Math.ceil(items.length/6)),current=Math.min(page,pages-1);
  return <section className="grocery-panel" aria-label="Groceries and expiry reminders">
    <header><div><h1>Groceries</h1><p>Scan your shopping. Keep track of dates.</p></div><button onClick={onReminders}>Reminders</button></header>
    {message?<p className="grocery-message" role="status">{message}</p>:null}
    <div className="grocery-layout"><section className="grocery-capture"><h2>Scan groceries</h2>
      <p>Show each product name and date clearly. For video, pause on each label; up to 45 seconds per clip.</p>
      <div className="grocery-actions">
        <button disabled={locked} onClick={()=>void photo()}>Take photo</button>
        <button disabled={locked} onClick={()=>video.current?.click()}>Record video</button>
        <button disabled={locked} onClick={()=>library.current?.click()}>Choose photos / video</button>
        <button disabled={locked||drafts.length>=40} onClick={()=>edit([...drafts,{id:crypto.randomUUID(),name:"",quantity:"",date:"",dateType:"unknown",dateText:""}])}>Add manually</button>
      </div>
      <input hidden ref={camera} type="file" accept="image/*" capture="environment" onChange={e=>{void prepare(Array.from(e.target.files??[]));e.target.value="";}}/>
      <input hidden ref={video} type="file" accept="video/*" capture="environment" onChange={e=>{void prepare(Array.from(e.target.files??[]));e.target.value="";}}/>
      <input hidden ref={library} type="file" accept="image/*,video/*" multiple onChange={e=>{void prepare(Array.from(e.target.files??[]));e.target.value="";}}/>
      {frames.length?<><p>{frames.length} photos / video frames ready</p>
        <p className="grocery-small">Read labels sends these images to OpenAI for analysis. The original video stays on your device. Check every date before saving.</p>
        <div className="grocery-actions"><button disabled={locked} onClick={()=>void read()}>{busy?"Working…":"Read labels"}</button>
        <button disabled={locked} onClick={()=>setFrames([])}>Clear captures</button></div></>:null}
      <p className="grocery-small">Reminders appear at 8am in your saved time zone, two days and one day before the date. Past reminder times are skipped.</p>
      {enablePush?<button disabled={busy} onClick={()=>{setBusy(true);void enablePush().then(ok=>setMessage(ok?"Phone alerts enabled.":"Phone alerts are unavailable. Your reminders are still saved in DiaryDock.")).catch(()=>setMessage("Phone alerts could not be enabled.")).finally(()=>setBusy(false));}}>Enable phone alerts</button>:null}
    </section><section className="grocery-stock"><h2>Your groceries <span>({items.length})</span></h2>
      {!items.length?<p>No groceries saved yet.</p>:items.slice(current*6,current*6+6).map(item=><article key={item.id}>
        <div><strong>{item.name}</strong><p>{item.quantity}</p><p>{item.date?((item.dateType==="use-by"?"Use by ":"Best before ")+new Date(item.date+"T12:00:00").toLocaleDateString()):"Date not set"}</p></div>
        <button disabled={busy} onClick={()=>void used(item.id)}>Used up</button>
      </article>)}
      {pages>1?<nav><button disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><span>{current+1} / {pages}</span><button disabled={current+1===pages} onClick={()=>setPage(current+1)}>Next</button></nav>:null}
    </section></div>
    {drafts.length?<section className="grocery-review-section"><h2>Check products and dates</h2>
      <GroceryReview items={drafts} onChange={edit} locked={locked}/>
      <label className="grocery-confirm"><input type="checkbox" checked={confirmed} disabled={locked} onChange={e=>setConfirmed(e.target.checked)}/>I have checked the products and dates against the packaging.</label>
      <button disabled={busy||!confirmed} onClick={()=>void save()}>{busy?"Saving…":pending?"Retry save":"Save groceries & reminders"}</button>
      {!pending?<button disabled={busy} onClick={()=>edit([])}>Discard review</button>:<p>Retry keeps the same batch so it cannot be saved twice.</p>}
    </section>:null}
  </section>;
}
