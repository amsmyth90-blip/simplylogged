import { appointmentAuth, appointmentResponse } from "@/lib/appointments/request";
import { handleAppointmentLetter } from "@/lib/appointments/letter-handler";
import { extractAppointmentLetter } from "@/lib/appointments/extraction";
import { secureCaptureFiles } from "@/lib/capture/analysis-security";
import { mobilePreflight } from "@/lib/http/mobile-cors";

export const OPTIONS = mobilePreflight;
export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  return handleAppointmentLetter(request, {
    authenticate: async () => (await appointmentAuth(request, "letter")).response ?? null,
    configured: () => Boolean(process.env.OPENAI_API_KEY),
    secure: secureCaptureFiles,
    extract: extractAppointmentLetter,
    respond: (body, status) => appointmentResponse(request, body, status),
  });
}
