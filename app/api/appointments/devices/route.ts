import { appointmentAuth, appointmentResponse } from "@/lib/appointments/request";
import { pushConfigured } from "@/lib/appointments/push-provider";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { mobilePreflight } from "@/lib/http/mobile-cors";
import { validateDocumentId } from "@/lib/document-upload";

export const runtime = "nodejs";
export const OPTIONS = mobilePreflight;

export async function GET(request: Request) {
  const auth = await appointmentAuth(request, "devices-read", 120);
  if (auth.response) return auth.response;
  return appointmentResponse(request, { ios: pushConfigured("ios"), android: pushConfigured("android") });
}

async function mutate(request: Request) {
  const auth = await appointmentAuth(request, "devices-write", 120);
  if (auth.response) return auth.response;
  try {
    const body = await readBoundedJson(request, 8192) as Record<string, unknown>;
    if (typeof body.id !== "string" || !validateDocumentId(body.id)) return appointmentResponse(request, { error: "Invalid device." }, 400);
    const admin = getSupabaseAdminClient();
    if (request.method === "DELETE") {
      const result = await admin.from("appointment_devices").delete().eq("id", body.id).eq("user_id", auth.user.id);
      if (result.error) throw result.error;
      return appointmentResponse(request, { removed: true });
    }
    if ((body.platform !== "ios" && body.platform !== "android") || typeof body.token !== "string"
      || !/^[A-Za-z0-9:_-]{20,4096}$/.test(body.token)
      || (body.platform === "ios" && !/^[0-9a-f]{64,200}$/i.test(body.token))) {
      return appointmentResponse(request, { error: "Invalid notification registration." }, 400);
    }
    if (!pushConfigured(body.platform)) return appointmentResponse(request, { error: "Remote phone alerts are not configured yet." }, 503);
    // A token must not remain assigned to the previous account on a shared device.
    const existing = await admin.from("appointment_devices").select("id,user_id").eq("platform", body.platform).eq("token", body.token).maybeSingle();
    if (existing.error) throw existing.error;
    const id = existing.data?.id ?? body.id;
    const collision = await admin.from("appointment_devices").select("user_id,token").eq("id", id).maybeSingle();
    if (collision.error || (collision.data && collision.data.user_id !== auth.user.id && collision.data.token !== body.token)) {
      return appointmentResponse(request, { error: "Register this phone again." }, 409);
    }
    const result = await admin.from("appointment_devices").upsert({ id, user_id: auth.user.id,
      platform: body.platform, token: body.token, updated_at: new Date().toISOString() });
    if (result.error) throw result.error;
    return appointmentResponse(request, { registered: true, id });
  } catch { return appointmentResponse(request, { error: "Phone alert registration failed. Please retry." }, 503); }
}

export const POST = mutate;
export const DELETE = mutate;
