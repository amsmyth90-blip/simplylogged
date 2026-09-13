import { useMemo } from "react";
import { GroceryPanel } from "../../../../components/groceries/GroceryPanel";
import { groceryRequest } from "../../../../lib/groceries/client";
import { getSecureRuntime } from "@mobile/platform/runtime-security";
import { getMobileSupabase } from "@mobile/auth/supabase-client";
import { takeDocumentPhoto } from "@mobile/capture/capture-source";
import { enableAppointmentPush } from "@mobile/appointments/phone-notifications";
export function GroceriesScreen({accessToken,onBack,onReminders}:{accessToken:string;onBack:()=>void;onReminders:()=>void}){
 const request=useMemo(()=>groceryRequest(getSecureRuntime().apiOrigin,accessToken),[accessToken]);
 return <main style={{padding:"max(16px,env(safe-area-inset-top)) 16px 32px",minHeight:"100svh",background:"#f4f7f3"}}>
   <button onClick={onBack} style={{marginBottom:16,minHeight:44}}>← Pantry & shopping</button>
   <GroceryPanel request={request} onReminders={onReminders} takePhoto={async()=>{
     const capture=await takeDocumentPhoto();return capture?new File([capture.bytes as BlobPart],"groceries.jpg",{type:capture.mimeType}):null;
   }} enablePush={()=>enableAppointmentPush({accessToken,apiOrigin:getSecureRuntime().apiOrigin,supabase:getMobileSupabase()})}/>
 </main>;
}
