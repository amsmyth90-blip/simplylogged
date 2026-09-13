import { timingSafeEqual } from "node:crypto";
import { deliverGroceryNotifications } from "@/lib/groceries/delivery";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:Request){
 const expected=process.env.CRON_SECRET,supplied=request.headers.get("authorization")??"";
 if(!expected||expected.length<32||Buffer.byteLength(supplied)!==Buffer.byteLength("Bearer "+expected)
 ||!timingSafeEqual(Buffer.from(supplied),Buffer.from("Bearer "+expected)))return Response.json({error:"Not found."},{status:404});
 try{return Response.json(await deliverGroceryNotifications(),{headers:{"Cache-Control":"no-store"}});}
 catch{return Response.json({error:"Grocery notifications unavailable."},{status:503});}
}
