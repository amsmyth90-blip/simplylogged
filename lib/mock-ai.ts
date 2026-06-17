export type DocumentAnalysis = {
  title: string;
  documentType: string;
  suggestedRoomId: string;
  suggestedRoomName: string;
  category: string;
  provider: string;
  policyNumber: string;
  issueDate: string;
  expiryDate: string;
  reminderDate: string;
  confidence: number;
  extractedSummary: string;
  suggestedReminders: SuggestedReminder[];
};

export type SuggestedReminder = {
  title: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

export const documentCategories = [
  "Insurance",
  "Warranty",
  "Appliance Manual",
  "Utility Bill",
  "Bank Statement",
  "Mortgage / Rent",
  "Tax",
  "Vehicle",
  "Pet",
  "Medical",
  "School",
  "Legal",
  "ID / Certificate",
  "Home Maintenance",
  "Other",
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

type AnalysisTemplate = {
  keywords: string[];
  title: string;
  documentType: string;
  suggestedRoomId: string;
  suggestedRoomName: string;
  category: DocumentCategory;
  provider: string;
  policyNumber: string;
  issueDate: string;
  expiryDate: string;
  reminderDate: string;
  summary: string;
  reminders: SuggestedReminder[];
};

const templates: AnalysisTemplate[] = [
  {
    keywords: ["home insurance", "buildings insurance", "contents insurance", "house insurance", "landlord insurance"],
    title: "Home Insurance Policy",
    documentType: "Insurance policy",
    suggestedRoomId: "family-room",
    suggestedRoomName: "Family Room",
    category: "Insurance",
    provider: "Home insurance provider",
    policyNumber: "HOME-19384",
    issueDate: "2026-06-09",
    expiryDate: "2027-05-19",
    reminderDate: "2027-04-19",
    summary: "Home insurance policy with renewal details and property cover information.",
    reminders: [{ title: "Review home insurance before renewal", dueDate: "2027-04-19", priority: "high" }],
  },
  {
    keywords: ["car insurance", "vehicle insurance", "motor insurance", "breakdown cover"],
    title: "Car Insurance Policy",
    documentType: "Insurance policy",
    suggestedRoomId: "garage",
    suggestedRoomName: "Garage",
    category: "Insurance",
    provider: "Vehicle insurance provider",
    policyNumber: "CAR-77821",
    issueDate: "2026-06-09",
    expiryDate: "2027-03-02",
    reminderDate: "2027-02-02",
    summary: "Vehicle insurance policy with annual renewal and policy number.",
    reminders: [{ title: "Compare car insurance before renewal", dueDate: "2027-02-02", priority: "high" }],
  },
  {
    keywords: ["pet insurance", "vet", "veterinary", "vaccination", "microchip", "pet vaccination"],
    title: "Pet Vaccination Record",
    documentType: "Pet record",
    suggestedRoomId: "garden",
    suggestedRoomName: "Garden",
    category: "Pet",
    provider: "Veterinary practice",
    policyNumber: "PET-8821",
    issueDate: "2026-06-09",
    expiryDate: "2027-07-12",
    reminderDate: "2027-06-12",
    summary: "Pet care record with vaccination, treatment, or insurance details.",
    reminders: [{ title: "Book pet vaccination check", dueDate: "2027-06-12", priority: "medium" }],
  },
  {
    keywords: ["boiler warranty", "warranty", "guarantee", "serial number", "manufacturer warranty"],
    title: "Boiler Warranty",
    documentType: "Warranty document",
    suggestedRoomId: "family-room",
    suggestedRoomName: "Family Room",
    category: "Warranty",
    provider: "Manufacturer or installer",
    policyNumber: "SERIAL-39211",
    issueDate: "2026-06-09",
    expiryDate: "2029-06-09",
    reminderDate: "2029-05-09",
    summary: "Warranty or guarantee document with serial number and expiry information.",
    reminders: [{ title: "Check warranty before it expires", dueDate: "2029-05-09", priority: "medium" }],
  },
  {
    keywords: ["boiler service", "gas safety", "service record", "maintenance", "repair"],
    title: "Boiler Service Record",
    documentType: "Maintenance document",
    suggestedRoomId: "family-room",
    suggestedRoomName: "Family Room",
    category: "Home Maintenance",
    provider: "Service provider",
    policyNumber: "JOB-39211",
    issueDate: "2026-06-09",
    expiryDate: "2027-02-10",
    reminderDate: "2027-01-10",
    summary: "Home maintenance record with service timing and provider details.",
    reminders: [{ title: "Book annual boiler service", dueDate: "2027-01-10", priority: "high" }],
  },
  {
    keywords: ["manual", "instruction manual", "user guide", "appliance", "washing machine", "dishwasher", "oven", "fridge"],
    title: "Appliance Manual",
    documentType: "Appliance manual",
    suggestedRoomId: "family-room",
    suggestedRoomName: "Family Room",
    category: "Appliance Manual",
    provider: "Appliance manufacturer",
    policyNumber: "MODEL-001",
    issueDate: "",
    expiryDate: "",
    reminderDate: "",
    summary: "Appliance manual or user guide. Usually no renewal reminder is needed.",
    reminders: [],
  },
  {
    keywords: ["utility bill", "electricity bill", "gas bill", "water bill", "council tax", "broadband bill", "energy bill"],
    title: "Utility Bill",
    documentType: "Utility bill",
    suggestedRoomId: "family-room",
    suggestedRoomName: "Family Room",
    category: "Utility Bill",
    provider: "Utility provider",
    policyNumber: "ACCT-10293",
    issueDate: "2026-06-09",
    expiryDate: "2026-07-09",
    reminderDate: "2026-07-02",
    summary: "Household utility bill with account details, billing period, and payment due date.",
    reminders: [{ title: "Pay or review utility bill", dueDate: "2026-07-02", priority: "medium" }],
  },
  {
    keywords: [
      "bank statement",
      "current account statement",
      "savings statement",
      "credit card statement",
      "mortgage statement",
      "loan statement",
      "statement period",
    ],
    title: "Bank Statement",
    documentType: "Bank statement",
    suggestedRoomId: "office",
    suggestedRoomName: "Office",
    category: "Bank Statement",
    provider: "Bank or lender",
    policyNumber: "Account ending 0000",
    issueDate: "2026-06-09",
    expiryDate: "",
    reminderDate: "",
    summary: "Banking statement or finance account record. Full account numbers should be masked before saving.",
    reminders: [],
  },
  {
    keywords: ["mortgage", "rent", "tenancy", "lease", "landlord"],
    title: "Mortgage or Rent Document",
    documentType: "Mortgage / rent document",
    suggestedRoomId: "office",
    suggestedRoomName: "Office",
    category: "Mortgage / Rent",
    provider: "Mortgage or rental provider",
    policyNumber: "MTG-84021",
    issueDate: "2026-06-09",
    expiryDate: "2028-09-30",
    reminderDate: "2028-03-30",
    summary: "Housing finance or rental document with account and review details.",
    reminders: [{ title: "Review mortgage or rent terms", dueDate: "2028-03-30", priority: "medium" }],
  },
  {
    keywords: ["tax", "hmrc", "self assessment", "p60", "p45"],
    title: "Tax Document",
    documentType: "Tax document",
    suggestedRoomId: "office",
    suggestedRoomName: "Office",
    category: "Tax",
    provider: "HMRC",
    policyNumber: "TAX-2026",
    issueDate: "2026-06-09",
    expiryDate: "2027-01-31",
    reminderDate: "2027-01-10",
    summary: "Tax record or filing document with date-sensitive review information.",
    reminders: [{ title: "Review tax document before deadline", dueDate: "2027-01-10", priority: "high" }],
  },
  {
    keywords: ["mot", "vehicle tax", "road tax", "service history", "v5c", "log book"],
    title: "Vehicle Document",
    documentType: "Vehicle document",
    suggestedRoomId: "garage",
    suggestedRoomName: "Garage",
    category: "Vehicle",
    provider: "DVLA or garage",
    policyNumber: "VEH-24019",
    issueDate: "2026-06-09",
    expiryDate: "2026-11-18",
    reminderDate: "2026-10-18",
    summary: "Vehicle record such as MOT, tax, service history, or registration document.",
    reminders: [{ title: "Review vehicle document before due date", dueDate: "2026-10-18", priority: "high" }],
  },
  {
    keywords: ["medical", "nhs", "prescription", "hospital", "clinic", "diagnosis", "vaccination record"],
    title: "Medical Record",
    documentType: "Medical document",
    suggestedRoomId: "bedroom",
    suggestedRoomName: "Bedroom",
    category: "Medical",
    provider: "Healthcare provider",
    policyNumber: "NHS-0000",
    issueDate: "2026-06-09",
    expiryDate: "",
    reminderDate: "",
    summary: "Medical document with health, treatment, or appointment information.",
    reminders: [],
  },
  {
    keywords: ["school", "nursery", "exam", "qualification", "certificate", "report card"],
    title: "School or Qualification Document",
    documentType: "School document",
    suggestedRoomId: "bedroom",
    suggestedRoomName: "Bedroom",
    category: "School",
    provider: "School or awarding body",
    policyNumber: "SCH-2026",
    issueDate: "2026-06-09",
    expiryDate: "",
    reminderDate: "",
    summary: "School, childcare, or qualification document for personal records.",
    reminders: [],
  },
  {
    keywords: ["will", "power of attorney", "poa", "solicitor", "funeral wishes", "legal"],
    title: "Legal Document",
    documentType: "Legal document",
    suggestedRoomId: "safe-room",
    suggestedRoomName: "Safe Room",
    category: "Legal",
    provider: "Legal provider",
    policyNumber: "LEGAL-2026",
    issueDate: "2026-06-09",
    expiryDate: "2029-06-09",
    reminderDate: "2029-03-09",
    summary: "Legal or legacy document that should be reviewed after major life changes.",
    reminders: [{ title: "Review legal document", dueDate: "2029-03-09", priority: "medium" }],
  },
  {
    keywords: ["passport", "birth certificate", "marriage certificate", "driving licence", "driver licence", "id card"],
    title: "ID or Certificate",
    documentType: "Identity or certificate document",
    suggestedRoomId: "bedroom",
    suggestedRoomName: "Bedroom",
    category: "ID / Certificate",
    provider: "Government or issuing body",
    policyNumber: "ID-4829",
    issueDate: "2026-06-09",
    expiryDate: "2031-08-14",
    reminderDate: "2031-02-14",
    summary: "Identity or certificate record with important personal details.",
    reminders: [{ title: "Review ID or certificate before expiry", dueDate: "2031-02-14", priority: "high" }],
  },
];

export function analyseDocument(fileName: string): DocumentAnalysis {
  const normalized = fileName.toLowerCase().replace(/[_-]+/g, " ");
  const matched = templates.find((template) =>
    template.keywords.some((keyword) => normalized.includes(keyword)),
  );

  if (!matched) {
    return fallbackAnalysis(fileName);
  }

  return {
    title: matched.title,
    documentType: matched.documentType,
    suggestedRoomId: matched.suggestedRoomId,
    suggestedRoomName: matched.suggestedRoomName,
    category: matched.category,
    provider: matched.provider,
    policyNumber: matched.policyNumber,
    issueDate: matched.issueDate,
    expiryDate: matched.expiryDate,
    reminderDate: matched.reminderDate,
    confidence: 0.42,
    extractedSummary: `${matched.summary} This is a development fallback based on the filename only, so please review before saving.`,
    suggestedReminders: matched.reminders,
  };
}

function fallbackAnalysis(fileName: string): DocumentAnalysis {
  return {
    title: tidyFileName(fileName),
    documentType: "Unidentified document",
    suggestedRoomId: "vault",
    suggestedRoomName: "Vault",
    category: "Other",
    provider: "Not detected",
    policyNumber: "Not detected",
    issueDate: "",
    expiryDate: "",
    reminderDate: "",
    confidence: 0.18,
    extractedSummary: "The fallback analyser could not confidently classify this file. Please review the details before saving.",
    suggestedReminders: [],
  };
}

function tidyFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
