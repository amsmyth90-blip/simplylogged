import { appointmentAuth, appointmentResponse } from "@/lib/appointments/request";
import { mobilePreflight } from "@/lib/http/mobile-cors";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { parseCommand } from "@/lib/groceries/model";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const OPTIONS = mobilePreflight;
export async function GET(request: Request) {
  const auth = await appointmentAuth(request,"groceries-read",90);
  if (auth.response) return auth.response;
  const result = await auth.supabase.from("grocery_items").select("id,name,quantity,date,date_type,date_text,time_zone,used_at")
    .eq("user_id",auth.user.id).is("used_at",null).order("date",{ascending:true,nullsFirst:false}).limit(300);
  if (result.error) return appointmentResponse(request,{error:"Groceries could not load. Please retry."},503);
  return appointmentResponse(request,{items:(result.data ?? []).map(row=>({
    id:row.id,name:row.name,quantity:row.quantity,date:row.date ?? "",dateType:row.date_type,dateText:row.date_text,
    timeZone:row.time_zone,usedAt:row.used_at
  }))});
}
export async function POST(request: Request) {
  const auth = await appointmentAuth(request,"groceries-write",40);
  if (auth.response) return auth.response;
  let command;
  try { command = parseCommand(await readBoundedJson(request,40_000)); }
  catch { return appointmentResponse(request,{error:"Check the product names, date labels and dates before saving."},400); }
  const admin = getSupabaseAdminClient();
  const result = command.operation === "SAVE"
    ? await admin.rpc("save_grocery_batch",{input_user_id:auth.user.id,input_batch_id:command.batchId,
        input_items:command.items,input_time_zone:command.timeZone})
    : await admin.rpc("use_grocery_item",{input_user_id:auth.user.id,input_id:command.id});
  if (result.error) return appointmentResponse(request,{error:"Groceries could not be saved. Retry with the same details or refresh the list."},409);
  return appointmentResponse(request,{saved:true});
}
