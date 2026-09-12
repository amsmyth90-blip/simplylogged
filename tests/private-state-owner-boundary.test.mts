import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("private state rejects cross-owner reads even with a permissive sibling policy", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.app_state(id text primary key,payload jsonb);
      grant all on public.app_state to authenticated,service_role;
      alter table public.app_state enable row level security;
      create policy "DiaryDock app state access" on public.app_state using(true) with check(true);
      create policy "unexpected permissive policy" on public.app_state using(true) with check(true);`);
    await db.query("insert into public.app_state values ($1,'{}'),($2,'{}')", [a,b]);
    const migration = await readFile(new URL("../supabase/migrations/20260911140000_private_state_owner_boundary.sql",import.meta.url),"utf8");
    await db.exec(migration);
    await db.exec(migration); // Reapplying the repair is safe.
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
    await db.exec("set role authenticated");
    assert.deepEqual((await db.query("select id from public.app_state")).rows,[{id:b}]);
    assert.equal((await db.query("select id from public.app_state where id=$1",[a])).rows.length,0);
    await assert.rejects(db.query("update public.app_state set payload='{}' where id=$1",[a]),/permission denied/);
    await assert.rejects(db.query("insert into public.app_state values ('injected','{}')"),/permission denied/);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from public.app_state"),/permission denied/);
    await db.exec("reset role; set role service_role");
    assert.equal((await db.query("update public.app_state set payload='{\"saved\":true}' where id=$1 returning id",[a])).rows.length,1);
  } finally { await db.close(); }
});
