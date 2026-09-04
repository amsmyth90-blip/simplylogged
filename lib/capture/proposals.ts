export type ConfirmedCaptureField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source: "uploaded_document";
  userConfirmed: boolean;
};

export type CaptureActionProposal = {
  dedupeKey: string;
  actionType: "create_record" | "update_record" | "create_reminder" | "link_document";
  riskLevel: "low" | "medium";
  title: string;
  summary: string;
  proposedPayload: Record<string, unknown>;
};

function normalizedFields(fields: ConfirmedCaptureField[]) {
  return Object.fromEntries(
    fields
      .filter((field) => field.userConfirmed && field.value.trim())
      .map((field) => [field.key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"), field.value.trim()])
  );
}

function pick(fields: Record<string, string>, keys: string[]) {
  return Object.fromEntries(keys.filter((key) => fields[key]).map((key) => [key, fields[key]]));
}

export function buildCaptureActionProposals(input: {
  captureJobId: string;
  documentId: string;
  detectedDocumentType?: string;
  title?: string;
  suggestedRoom?: string;
  dueDate?: string;
  fields: ConfirmedCaptureField[];
}) {
  const fields = normalizedFields(input.fields);
  const haystack = `${input.detectedDocumentType ?? ""} ${input.title ?? ""} ${input.suggestedRoom ?? ""}`.toLowerCase();
  const proposals: CaptureActionProposal[] = [];
  const basePayload = { sourceDocumentId: input.documentId, captureJobId: input.captureJobId };

  const motFields = pick(fields, ["registration", "vehicle_registration", "test_date", "mot_expiry", "expiry_date", "mileage", "result"]);
  if (/\bmot\b/.test(haystack) || Object.keys(motFields).length >= 2) {
    proposals.push({
      dedupeKey: `${input.captureJobId}:vehicle-mot`,
      actionType: "update_record",
      riskLevel: "medium",
      title: "Update vehicle MOT details",
      summary: "Review the vehicle, test date, mileage and expiry before updating its MOT record.",
      proposedPayload: { ...basePayload, resourceType: "vehicle", fields: motFields }
    });
    const motDue = fields.mot_expiry || fields.expiry_date || input.dueDate;
    if (motDue) {
      proposals.push({
        dedupeKey: `${input.captureJobId}:vehicle-mot-reminder`,
        actionType: "create_reminder",
        riskLevel: "low",
        title: "Create an MOT expiry reminder",
        summary: "Use the confirmed MOT expiry date to prepare reminder dates.",
        proposedPayload: { ...basePayload, resourceType: "vehicle", dueDate: motDue, reminderType: "mot_expiry" }
      });
    }
  }

  const applianceFields = pick(fields, ["product", "appliance", "manufacturer", "model", "serial_number", "purchase_date", "retailer", "price", "warranty_duration", "warranty_expiry"]);
  if (/appliance|washing machine|dishwasher|fridge|receipt|warranty|guarantee/.test(haystack) && Object.keys(applianceFields).length) {
    proposals.push({
      dedupeKey: `${input.captureJobId}:appliance`,
      actionType: "create_record",
      riskLevel: "medium",
      title: "Create an appliance record",
      summary: "Check the product and purchase details before adding this appliance.",
      proposedPayload: { ...basePayload, resourceType: "asset", fields: applianceFields }
    });
    const warrantyDue = fields.warranty_expiry || input.dueDate;
    if (warrantyDue) {
      proposals.push({
        dedupeKey: `${input.captureJobId}:appliance-warranty-reminder`,
        actionType: "create_reminder",
        riskLevel: "low",
        title: "Create a warranty expiry reminder",
        summary: "Use the confirmed warranty date to prepare reminder dates.",
        proposedPayload: { ...basePayload, resourceType: "asset", dueDate: warrantyDue, reminderType: "warranty_expiry" }
      });
    }
  }

  const vaccinationFields = pick(fields, ["pet_name", "animal_name", "vaccine", "vaccination_date", "next_due_date", "vet", "batch_number"]);
  if (/pet|veterinary|vaccination|vaccine/.test(haystack) || Object.keys(vaccinationFields).length >= 2) {
    proposals.push({
      dedupeKey: `${input.captureJobId}:pet-vaccination`,
      actionType: "create_record",
      riskLevel: "medium",
      title: "Add a pet vaccination record",
      summary: "Check the pet, vaccine and dates before adding the vaccination.",
      proposedPayload: { ...basePayload, resourceType: "pet", recordType: "vaccination", fields: vaccinationFields }
    });
    if (fields.next_due_date) {
      proposals.push({
        dedupeKey: `${input.captureJobId}:pet-vaccination-reminder`,
        actionType: "create_reminder",
        riskLevel: "low",
        title: "Create a vaccination reminder",
        summary: "Use the confirmed next-due date to prepare reminder dates.",
        proposedPayload: { ...basePayload, resourceType: "pet", dueDate: fields.next_due_date, reminderType: "vaccination_due" }
      });
    }
  }

  return proposals;
}
