"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { GroceryPanel } from "./GroceryPanel";
import { groceryRequest } from "../../lib/groceries/client";
export function WebGroceries(){
 const router=useRouter();
 const request=useMemo(()=>groceryRequest(typeof window==="undefined"?"https://diarydock.com":window.location.origin),[]);
 return <GroceryPanel request={request} onReminders={()=>router.push("/reminders")}/>;
}
