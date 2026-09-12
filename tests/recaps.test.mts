import test from "node:test";
import assert from "node:assert/strict";
import { buildRecap, parseRecapPreferences } from "../lib/recaps/model.ts";
test("recaps use local calendar days and include overdue plus the next seven days", () => {
  const items = [
    { id:"old", title:"Renew cover", dueAt:"2026-09-11T12:00:00Z", target:"reminders" as const },
    { id:"today", title:"Dentist", dueAt:"2026-09-12T23:30:00Z", target:"appointments" as const },
    { id:"week", title:"MOT", dueAt:"2026-09-20T10:00:00Z", target:"reminders" as const },
    { id:"later", title:"Later", dueAt:"2026-09-21T10:00:00Z", target:"reminders" as const },
  ];
  const now = new Date("2026-09-12T23:15:00Z");
  const daily = buildRecap("daily", items, "Europe/London", now);
  assert.equal(daily.date,"2026-09-13");
  assert.deepEqual(daily.items.map(i=>i.id),["old","today"]);
  assert.equal(daily.items[0]!.overdue,true);
  assert.equal(daily.items[1]!.overdue,false);
  assert.deepEqual(buildRecap("weekly",items,"Europe/London",now).items.map(i=>i.id),["old","today","week"]);
});
test("recaps discard invalid dates, deduplicate and mark bounded results", () => {
  const item = {id:"1", title:"A",dueAt:"2026-09-12T00:00:00Z",target:"reminders" as const};
  const now = new Date("2026-09-12T08:00:00Z");
  assert.equal(buildRecap("daily",[item,item,{...item,id:"2",dueAt:"invalid"}],"Europe/London",now).items.length,1);
  const many = buildRecap("daily",Array.from({length:101},(_,i)=>({...item,id:String(i)})),"Europe/London",now);
  assert.equal(many.items.length,100); assert.equal(many.truncated,true);
});
test("recap preferences reject injected ownership, non-booleans and invalid zones", () => {
  const valid = {daily:true,weekly:true,push:false,timeZone:"Europe/London"};
  assert.deepEqual(parseRecapPreferences(valid),{...valid,dailyTime:"08:00",weeklyTime:"20:00"});
  assert.equal(parseRecapPreferences({...valid,dailyTime:"06:45",weeklyTime:"21:30"}).dailyTime,"06:45");
  for(const time of ["24:00","8am","08:60","",null]) assert.throws(()=>parseRecapPreferences({...valid,dailyTime:time}));
  for (const invalid of [{...valid,user_id:"other"},{...valid,daily:"true"},{...valid,timeZone:"Invalid/Zone"},null]) {
    assert.throws(()=>parseRecapPreferences(invalid));
  }
});
