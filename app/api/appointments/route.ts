import { appointmentAuth, appointmentResponse } from "@/lib/appointments/request";
import { appointmentSchedule, parseAppointmentDraft } from "@/lib/appointments/model";
import { mobilePreflight } from "@/lib/http/mobile-cors";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateDocumentId } from "@/lib/document-upload";

export const runtime = "nodejs";
export const OPTIONS = mobilePreflight;

export async function POST(request: Request) {
  const auth = await appointmentAuth(request, "save", 40);
  if (auth.response) return auth.response;
  let args;
  try {
    const body = await readBoundedJson(request, 16 * 1024) as Record<string, unknown>;
    if (!body || typeof body !== "object" || typeof body.id !== "string" || !validateDocumentId(body.id)
      || typeof body.documentId !== "string" || !validateDocumentId(body.documentId)
      || typeof body.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.createdAt)
      || !Number.isFinite(Date.parse(body.createdAt)) || typeof body.notify !== "boolean"
      || body.confirmed !== true || (body.reminderMinutes !== null && typeof body.reminderMinutes !== "number")) {
      throw new Error("Review and confirm the appointment details before saving.");
    }
    const draft = parseAppointmentDraft(body.draft);
    const schedule = appointmentSchedule(draft, body.reminderMinutes as number | null);
    const record = { ...draft, id: body.id, documentId: body.documentId, status: "planned",
      followUpNotes: "", createdAt: body.createdAt,
      ...(schedule.remindAt ? { reminderId: body.id } : {}) };
    args = { input_user_id: auth.user.id, input_id: body.id, input_document_id: body.documentId,
      input_record: record, input_start_at: schedule.startAt, input_remind_at: schedule.remindAt, input_notify: body.notify };
  } catch (error) {
    return appointmentResponse(request, { error: error instanceof Error ? error.message : "Invalid appointment." }, 400);
  }
  try {
    const result = await getSupabaseAdminClient().rpc("save_letter_appointment", args);
    if (result.error) {
      const conflict = /already (exists|saved)/i.test(result.error.message);
      return appointmentResponse(request, { error: conflict
        ? "This appointment has already been saved. Check your appointments before adding it again."
        : "The appointment could not be saved. Your uploaded letter is still in Health files. Please retry." }, conflict ? 409 : 503);
    }
    return appointmentResponse(request, result.data);
  } catch {
    return appointmentResponse(request, { error: "Appointment saving is not configured." }, 503);
  }
}
