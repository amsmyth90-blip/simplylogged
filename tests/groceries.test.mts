import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { parseCommand, validDate, reminderDates } from "../lib/groceries/model.ts";
const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222";
const batch="33333333-3333-4333-8333-333333333333",id="44444444-4444-4444-8444-444444444444";
const product={id,name:"Milk",quantity:"2 litres",date:"2026-10-26",dateType:"use-by",dateText:"USE BY 26 OCT 2026"};
test("grocery contracts reject ownership injection, invalid dates and unconfirmed saves",()=>{
 const command={operation:"SAVE",batchId:batch,confirmed:true,timeZone:"Europe/London",items:[product]};
 assert.equal(parseCommand(command).operation,"SAVE");
 for(const bad of [{...command,userId:b},{...command,confirmed:false},{...command,timeZone:"Invalid/Zone"},
 {...command,items:[product,product]},{...command,items:[{...product,date:"2026-02-30"}]},
 {...command,items:[{...product,date:"2026-99-02"}]},{...command,items:[{...product,dateType:"unknown"}]}])
 assert.throws(()=>parseCommand(bad));
 assert.equal(validDate("2026-99-02"),false);
 assert.equal(validDate("2028-02-29"),true);assert.equal(validDate("2026-02-29"),false);
 assert.deepEqual(reminderDates("2026-03-01").map(x=>x.date),["2026-02-27","2026-02-28"]);
 assert.doesNotThrow(()=>parseCommand({...command,items:[{...product,date:"",dateType:"unknown"}]}));
});
test("grocery SQL enforces privacy, atomic idempotency, DST reminders, leases and used-up cancellation",async()=>{
 const db=new PGlite();
 try{
 await db.exec(`
 create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$ select current_setting('request.uid',true)::uuid $$;
 create function auth.role() returns text language sql as $$ select current_setting('request.role',true) $$;
 grant usage on schema auth to authenticated;
 create function grocery_clock() returns timestamptz language sql as $$ select current_setting('test.clock')::timestamptz $$;
 select set_config('test.clock','2026-10-23T06:00:00Z',false);
 select set_config('request.role','service_role',false);
 create table public.appointment_devices(id uuid primary key,user_id uuid,platform text,token text,updated_at timestamptz);
 create table public.reminders(id text primary key,user_id uuid,scope_kind text,scope_id uuid,title text,note text,
 room_id text,room_name text,reminder_group text,priority text,time_label text,due_at timestamptz,source_due_at timestamptz,
 time_zone text,origin text,reminder_type text,source_resource_type text,source_resource_id text,source_date_key text,
 rule_id text,rule_version integer,schedule_offset_days integer,dedupe_key text,unique(user_id,dedupe_key));
 `);
 const sql=await readFile(new URL("../supabase/migrations/20260913100000_grocery_expiry.sql",import.meta.url),"utf8");
 await db.exec(sql.replaceAll("now()","public.grocery_clock()"));
 await db.query("insert into auth.users values($1),($2)",[a,b]);
 await db.query("insert into appointment_devices values($1,$1,'android',repeat('a',64),grocery_clock()),($2,$2,'ios',repeat('b',64),grocery_clock())",[a,b]);
 const save=(items:unknown[],batchId=batch,user=a)=>db.query("select save_grocery_batch($1,$2,$3::jsonb,'Europe/London')",[user,batchId,JSON.stringify(items)]);
 await save([product]);await save([product]);
 assert.equal((await db.query("select * from grocery_items")).rows.length,1);
 const reminders=(await db.query<{due_at:Date}>("select * from reminders order by due_at")).rows;
 assert.equal(reminders.length,2);
 assert.equal(new Date(reminders[0]!.due_at).toISOString(),"2026-10-24T07:00:00.000Z");
 assert.equal(new Date(reminders[1]!.due_at).toISOString(),"2026-10-25T08:00:00.000Z","local 8am across DST");
 await assert.rejects(save([{...product,name:"Changed"}]));
 // A conflicting product makes the entire next batch roll back.
 await assert.rejects(save([{...product,id:b},product],b));
 assert.equal((await db.query("select * from grocery_items")).rows.length,1);
 await db.exec("set role authenticated");await db.query("select set_config('request.uid',$1,false)",[b]);
 assert.equal((await db.query("select * from grocery_items")).rows.length,0);
 await assert.rejects(save([product],id,b));await assert.rejects(db.query("delete from grocery_items"));
 await db.exec("reset role");await assert.rejects(db.query("select use_grocery_item($1,$2)",[b,id]));
 const clock=(time:string)=>db.query("select set_config('test.clock',$1,false)",[time]);
 const claim=()=>db.query<{user_id:string;offset_days:number}>("select * from claim_grocery_notifications()");
 await clock("2026-10-24T06:59:00Z");assert.equal((await claim()).rows.length,0);
 await clock("2026-10-24T07:00:00Z");
 const first=(await claim()).rows;assert.equal(first.length,1);assert.equal(first[0]!.user_id,a);assert.equal(first[0]!.offset_days,2);
 assert.equal((await claim()).rows.length,0);
 await db.query("select use_grocery_item($1,$2)",[a,id]);
 assert.equal((await db.query("select * from reminders where reminder_group<>'done'")).rows.length,0);
 assert.equal((await db.query("select * from grocery_notifications where status='cancelled'")).rows.length,1);
 await clock("2026-10-25T08:00:00Z");assert.equal((await claim()).rows.length,0);
 await save([product]);assert.equal((await db.query("select * from grocery_items where used_at is null")).rows.length,0,"retry must not resurrect consumed groceries");
 // Same product names remain separate batches with separate dates.
 await save([{...product,id:a,date:"2026-10-29"},{...product,id:b,date:"",dateType:"unknown"}],id);
 assert.equal((await db.query("select * from grocery_items where used_at is null")).rows.length,2);
 assert.equal((await db.query("select * from reminders where reminder_group<>'done'")).rows.length,2,"undated items get no reminders");
 }finally{await db.close();}
});
