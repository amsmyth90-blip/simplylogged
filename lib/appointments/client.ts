import type { SupabaseClient } from "@supabase/supabase-js";
import { readBoundedJsonResponse } from "../http/bounded-json-response.ts";
import { parseAppointmentAnalysis, type AppointmentDraft } from "./model.ts";
import { APPOINTMENT_LETTER_CONSENT } from "./letter-consent.ts";

export type AppointmentConnection = { apiOrigin: string | URL; accessToken?: string; supabase: SupabaseClient };
export type AppointmentSave = {
  id: string; documentId: string; createdAt: string; draft: AppointmentDraft;
  reminderMinutes: number | null; notify: boolean; confirmed: true;
};

export async function appointmentRequest(connection: AppointmentConnection, path: string, body?: unknown, method = "POST") {
  const form = body instanceof FormData;
  const response = await fetch(new URL(path, connection.apiOrigin), {
    method, credentials: connection.accessToken ? "omit" : "same-origin", cache: "no-store", redirect: "error",
    signal: AbortSignal.timeout(90_000),
    headers: { Accept: "application/json", ...(form || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(connection.accessToken ? { Authorization: `Bearer ${connection.accessToken}` } : {}) },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  const result = await readBoundedJsonResponse(response, 64 * 1024) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "DiaryDock could not complete that step.");
  return result;
}

export async function readAppointmentLetter(connection: AppointmentConnection, file: File, consent: boolean) {
  if (!consent) throw new Error("Please consent to sending this letter to OpenAI before using automatic reading.");
  const form = new FormData(); form.set("file", file);
  form.set("consent", APPOINTMENT_LETTER_CONSENT);
  const result = await appointmentRequest(connection, "/api/appointments/letter", form);
  return parseAppointmentAnalysis(result.analysis);
}

// Keep the reservation and committed result across retries. A lost response must
// not cause another letter upload or a second appointment.
export class AppointmentLetterUpload {
  private reservation: { reservationId: string; bucket: string; path: string; token: string } | null = null;
  private transferred = false;
  private committed = false;
  readonly documentId: string;
  constructor(documentId: string) { this.documentId = documentId; }

  async save(connection: AppointmentConnection, file: File, draft: AppointmentDraft) {
    if (this.committed) return;
    if (!this.reservation) {
      const result = await appointmentRequest(connection, "/api/documents/uploads/prepare", {
        documentId: this.documentId, fileName: file.name, mimeType: file.type, size: file.size,
      });
      for (const key of ["reservationId", "bucket", "path", "token"]) {
        if (typeof result[key] !== "string" || !result[key]) throw new Error("The letter upload could not be prepared.");
      }
      this.reservation = { reservationId: result.reservationId as string, bucket: result.bucket as string,
        path: result.path as string, token: result.token as string };
    }
    const reservation = this.reservation!;
    if (!this.transferred) {
      const result = await connection.supabase.storage.from(reservation.bucket)
        .uploadToSignedUrl(reservation.path, reservation.token, file, { contentType: file.type, upsert: false });
      // A duplicate on this private, randomly reserved path is a retry of this upload.
      if (result.error && !/already exists|duplicate|conflict/i.test(result.error.message)) throw new Error("Letter upload failed. Please retry.");
      this.transferred = true;
    }
    const result = await appointmentRequest(connection, "/api/documents/uploads/commit", {
      reservationId: reservation.reservationId,
      metadata: { title: `${draft.title} — appointment letter`.slice(0, 240), category: "Health & Medical",
        roomName: "Bedroom", issuer: draft.provider, dueDate: draft.date, actionItems: [], confirmedFields: [] },
    });
    if (result.documentId !== this.documentId) throw new Error("The letter could not be confirmed. Please retry.");
    this.committed = true;
  }
}
