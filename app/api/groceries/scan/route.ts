import { appointmentAuth, appointmentResponse } from "@/lib/appointments/request";
import { mobilePreflight } from "@/lib/http/mobile-cors";
import { analyseGroceries } from "@/lib/groceries/analysis";
export const runtime = "nodejs";
export const maxDuration = 90;
export const OPTIONS = mobilePreflight;
export async function POST(request: Request) {
  const auth = await appointmentAuth(request,"grocery-scan",10);
  if (auth.response) return auth.response;
  if (request.headers.get("x-grocery-consent") !== "labels-v1")
    return appointmentResponse(request,{error:"Confirm sending label images to OpenAI."},400);
  if (!process.env.OPENAI_API_KEY) return appointmentResponse(request,{error:"Automatic label reading is not available yet. You can add products manually."},503);
  try { return appointmentResponse(request,{items:await analyseGroceries(request)}); }
  catch { return appointmentResponse(request,{error:"Labels could not be read. Try clear close-ups, or add the details manually."},422); }
}
