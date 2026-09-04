import type { AnalysisMode } from "./analysis-types.ts";

function pageInstruction(pageCount: number) {
  return `Read all ${pageCount} page${pageCount === 1 ? "" : "s"} carefully and treat them as one document in page order.`;
}

function sentence(...parts: string[]) {
  return parts.join(" ");
}

function documentPrompt(pageCount: number) {
  return [
    "You are extracting structured details from a photographed household document for a mobile app called DiaryDock.",
    pageInstruction(pageCount),
    "Return OCR text plus the most useful filing and follow-up metadata for a family organizer.",
    sentence(
      "Choose exactly one suggestedRoom from this estate map:",
      "Attic for memories, keepsakes, old letters, and family history;",
      "Office for legal, identity, contracts, deeds, finance, and official paperwork;",
      "Garage for vehicles, MOT, car insurance, service history, and transport renewals;",
      "Bedroom for personal health, medical, GP, prescriptions, and wellbeing;",
      "Family Room for school forms, family plans, household lists, and shared schedules;",
      "Kitchen for appliance manuals, warranties, food plans, grocery receipts, recipes,",
      "kitchen repairs, and household food documents;",
      "Garden for pets, vet records, outdoor care, and home maintenance outside;",
      "Driveway for travel, parking, guests, access notes, deliveries, and trips;",
      "Safe Room for emergency plans, insurance claims, crisis contacts, authority notes,",
      "and legacy-critical instructions; Mailbox only when the document is new incoming",
      "post that still needs routing.",
    ),
    "If a field is uncertain, make the safest reasonable guess.",
    "Look carefully for any expiry, renewal, appointment, MOT, tax, insurance, passport, warranty, school deadline, payment due, review, or service date.",
    "Use ISO YYYY-MM-DD for dueDate when a complete date is visible. Keep dueDate empty rather than guessing when it is absent or incomplete.",
    "If a date is useful for follow-up, set dueDate and make reminderTitle/timeLabel practical for a household user.",
    "Keep reminderTimeLabel human friendly, for example: Today, This week, In 14 days, Next month.",
    "Keep extractedText concise but useful. Include key lines, not every visual detail.",
    sentence(
      "Return extractedFields for useful structured values visible in the document.",
      "Use stable snake_case keys. For MOT documents prefer registration, test_date,",
      "mot_expiry, mileage and result. For appliance receipts or warranties prefer product,",
      "manufacturer, model, serial_number, purchase_date, retailer, price, warranty_duration",
      "and warranty_expiry. For pet vaccination records prefer pet_name, vaccine,",
      "vaccination_date, next_due_date, vet and batch_number. Each field must retain its own",
      "confidence, source uploaded_document and userConfirmed false. Do not include a field",
      "when its value is absent.",
    ),
  ].join(" ");
}

function willPrompt(pageCount: number) {
  return [
    "You are reading an uploaded will for DiaryDock, a private household organisation app.",
    pageInstruction(pageCount),
    "Create an informational, plain-language index of what is explicitly stated. Do not provide legal advice, decide whether the will is valid, or infer legal meaning that is not written.",
    "Separate detected references into executors, beneficiaries, guardians, specific gifts, charitable gifts, residue of estate, funeral wishes references, conditions or special instructions, and questions or unclear wording.",
    "Use short factual phrases. Keep an array empty when nothing is detected. Put ambiguity, unreadable wording, conflicts or matters needing professional interpretation into questionsOrUnclearWording.",
    "The user must review every result against the original, so do not describe any extracted detail as confirmed.",
    "Keep extractedText concise and limited to key lines needed for review rather than reproducing the entire document.",
  ].join(" ");
}

function billPrompt(pageCount: number) {
  return [
    "You are reading a household bill for DiaryDock, a private household organisation app.",
    pageInstruction(pageCount),
    "Extract only information visible in the bill. Never invent a date, amount, payment method or contract term.",
    "Use ISO YYYY-MM-DD for dates, or an empty string when no date is visible. Use 0 when no payable amount is visible.",
    "Classify the bill as Utilities, Council tax, Communications, Subscriptions, Home services or Other.",
    "Mask account numbers so that only the final four characters are shown. Never return bank account or card details.",
    "Frequency must be monthly, quarterly, annual or one-off. Use one-off if the document does not make a recurring frequency clear.",
    "Add any uncertainty or field the user should verify to reviewReasons. The user must review everything before it is saved as confirmed.",
    "Keep extractedText to the key lines needed for review and do not reproduce unrelated personal information.",
  ].join(" ");
}

function insurancePrompt(pageCount: number) {
  return [
    "You are reading an insurance policy document for DiaryDock, a private household organisation app.",
    pageInstruction(pageCount),
    "This Office section accepts Home, Life, Income protection, Critical illness and Other personal protection policies only. Do not classify vehicle, pet, travel or medical insurance into this Office section.",
    "Use ISO YYYY-MM-DD dates or an empty string. Use 0 when a premium or excess is not visible.",
    "Mask policy numbers so only the final four characters remain visible. Do not return bank, card or login details.",
    "Summarise cover in simple neutral language without interpreting legal effect or advising whether the cover is suitable.",
    "Separate clearly included and excluded cover. Do not infer an exclusion or inclusion that is not stated.",
    "Add uncertainty and every important detail the user should verify to reviewReasons. The result is never confirmed until the user checks it against the original.",
  ].join(" ");
}

function receiptPrompt(pageCount: number) {
  return [
    "You are reading a vehicle receipt for DiaryDock, a private household organisation app.",
    pageInstruction(pageCount),
    "Extract only information explicitly visible.",
    "Use ISO YYYY-MM-DD for the transaction date, or an empty string when it is not visible. Use 0 when the total paid is unclear.",
    "Classify the receipt as Fuel, Service, Repair, Tax, Insurance, Breakdown, Tyres, Parking or Other.",
    "Mileage must be an integer only when it is printed or handwritten clearly on the receipt; otherwise return null.",
    "Payment method may describe cash, card or another visible method, but must never include card or bank numbers.",
    "Return the receipt or invoice number only when visible. Do not return customer addresses, card numbers or unrelated personal information.",
    "Add every uncertain, unreadable or inferred field to reviewReasons. The result is a suggestion until the user checks it against the original.",
  ].join(" ");
}

export function captureAnalysisPrompt(mode: AnalysisMode, pageCount: number) {
  if (mode === "will") return willPrompt(pageCount);
  if (mode === "bill") return billPrompt(pageCount);
  if (mode === "insurance") return insurancePrompt(pageCount);
  if (mode === "receipt") return receiptPrompt(pageCount);
  return documentPrompt(pageCount);
}
