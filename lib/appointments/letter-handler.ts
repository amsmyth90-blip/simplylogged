import { readBoundedFormData, RequestBodyError } from "../http/bounded-form-data.ts";
import type { CaptureFile, SafeCaptureFile } from "../capture/analysis-types.ts";
import type { AppointmentAnalysis } from "./model.ts";
import { APPOINTMENT_LETTER_CONSENT } from "./letter-consent.ts";

const maximumFileBytes = 4 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

type Dependencies = {
  authenticate: () => Promise<Response | null>;
  configured: () => boolean;
  secure: (files: CaptureFile[]) => Promise<
    | { ok: true; files: SafeCaptureFile[] }
    | { ok: false; error: string; status: number }
  >;
  extract: (file: SafeCaptureFile) => Promise<AppointmentAnalysis>;
  respond: (body: unknown, status?: number) => Response;
};

export async function handleAppointmentLetter(request: Request, dependencies: Dependencies) {
  const denied = await dependencies.authenticate();
  if (denied) return denied;
  if (!dependencies.configured()) {
    return dependencies.respond({ error: "Automatic letter reading is not configured. You can enter the appointment details yourself." }, 503);
  }
  let file: File;
  try {
    const form = await readBoundedFormData(request, maximumFileBytes + 64 * 1024);
    if (form.getAll("consent").length !== 1 || form.get("consent") !== APPOINTMENT_LETTER_CONSENT) {
      return dependencies.respond({ error: "Please consent to sending this letter to OpenAI before using automatic reading." }, 400);
    }
    if ([...form.keys()].some((key) => key !== "file" && key !== "consent") || form.getAll("file").length !== 1) {
      return dependencies.respond({ error: "Choose one appointment photo or PDF." }, 400);
    }
    const candidate = form.get("file");
    if (!(candidate instanceof File) || !candidate.size || candidate.size > maximumFileBytes || !allowedTypes.has(candidate.type)) {
      return dependencies.respond({ error: "Choose one PDF, JPG, PNG or WebP letter under 4 MB." }, 400);
    }
    file = candidate;
  } catch (error) {
    return dependencies.respond({ error: "The letter upload is invalid or too large. Choose a letter under 4 MB." },
      error instanceof RequestBodyError ? error.status : 400);
  }
  try {
    const security = await dependencies.secure([file]);
    if (!security.ok) return dependencies.respond({ error: security.error }, security.status);
    if (security.files.length !== 1 || !allowedTypes.has(security.files[0]!.mimeType)) {
      return dependencies.respond({ error: "This letter format is not supported." }, 400);
    }
    return dependencies.respond({ analysis: await dependencies.extract(security.files[0]!) });
  } catch {
    return dependencies.respond({ error: "The letter could not be read. Try a clear photo or an unlocked PDF of up to twelve pages, or enter the details yourself." }, 422);
  }
}
