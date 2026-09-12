import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function environment(source) {
  const values = {};
  for (const line of source.split(/\r?\n/u)) {
    const match = /^([^#=]+)=(.*)$/u.exec(line);
    if (match) values[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/gu, "");
  }
  return values;
}

const values = environment(await readFile(".env.local", "utf8"));
if (!values.NEXT_PUBLIC_SUPABASE_URL || !values.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server configuration is missing.");
const admin = createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const [vaults, entries] = await Promise.all([
  admin.from("password_vaults").select("user_id", { head: true, count: "exact" }).limit(1),
  admin.from("password_vault_entries").select("user_id", { head: true, count: "exact" }).limit(1),
]);
if (vaults.error || entries.error) {
  console.log("Password Vault tables: unavailable");
  process.exitCode = 2;
} else console.log("Password Vault tables: ready");
