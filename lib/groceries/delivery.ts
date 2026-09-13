import "server-only";
import { getSupabaseAdminClient } from "../supabase/admin";
import { sendDiaryDockPush, PushDeliveryError } from "../appointments/push-provider";
export async function deliverGroceryNotifications() {
 const admin=getSupabaseAdminClient(),claimed=await admin.rpc("claim_grocery_notifications");
 if(claimed.error)throw Error("Grocery notification queue unavailable.");
 let sent=0,failed=0;
 await Promise.all((claimed.data??[]).map(async(job:{id:string;user_id:string;item_id:string;device_id:string;attempts:number;lease_until:string;expires_at:string;offset_days:number})=>{
  const update=(fields:object)=>admin.from("grocery_notifications").update(fields).eq("id",job.id).eq("status","sending").eq("lease_until",job.lease_until);
  try{
   const [item,device,reminder]=await Promise.all([
    admin.from("grocery_items").select("used_at").eq("user_id",job.user_id).eq("id",job.item_id).maybeSingle(),
    admin.from("appointment_devices").select("user_id,platform,token,updated_at").eq("id",job.device_id).maybeSingle(),
    admin.from("reminders").select("reminder_group").eq("user_id",job.user_id).eq("source_resource_type","grocery")
     .eq("source_resource_id",job.item_id).eq("schedule_offset_days",job.offset_days).maybeSingle()
   ]);
   if(item.error||device.error||reminder.error)throw Error("Notification source unavailable.");
   if(!item.data||item.data.used_at||!device.data||device.data.user_id!==job.user_id
    ||Date.parse(device.data.updated_at)<Date.now()-90*86400000||!reminder.data||reminder.data.reminder_group==="done"
    ||Date.parse(job.expires_at)<=Date.now()){await update({status:"cancelled",lease_until:null});return;}
   await sendDiaryDockPush(device.data,job.id,"Some groceries are approaching their labelled date. Open DiaryDock to check them.","groceries");
   const result=await update({status:"sent",sent_at:new Date().toISOString(),lease_until:null});
   if(result.error)throw Error("Notification receipt unavailable.");sent++;
  }catch(error){
   failed++;
   if(error instanceof PushDeliveryError&&error.invalidToken)await admin.from("appointment_devices").delete().eq("id",job.device_id).eq("user_id",job.user_id);
   else await update({status:job.attempts>=8?"failed":"pending",lease_until:null,
     due_at:new Date(Date.now()+Math.min(3600,30*2**job.attempts)*1000).toISOString()});
  }
 }));
 return {sent,failed};
}
