import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20260901133000_central_reminder_engine.sql", import.meta.url), "utf8");

test("distinguishes user and system reminders with stable dedupe", () => {
  assert.match(sql, /origin in \('USER_CREATED', 'SYSTEM_GENERATED'\)/i);
  assert.match(sql, /unique index if not exists reminders_user_dedupe_idx/i);
  assert.match(sql, /on conflict \(user_id, dedupe_key\) do update/i);
});

test("derives reminder ownership from the authenticated database user", () => {
  assert.match(sql, /current_user_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /if current_user_id is null then raise exception 'Authentication required'/i);
});

test("updates generated schedules without overwriting completed reminders", () => {
  assert.match(sql, /when public\.reminders\.reminder_group = 'done' then 'done'/i);
  assert.match(sql, /and reminder_group <> 'done'[\s\S]*schedule_offset_days/i);
});
