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

type AnalysisTemplate = {
  keywords: string[];
  title: string;
  documentType: string;
  suggestedRoomId: string;
  suggestedRoomName: string;
  category: string;
  provider: string;
  policyNumber: string;
  expiryDate: string;
  reminderDate: string;
  summary: string;
  reminders: string[];
};

const templates: AnalysisTemplate[] = [
  {
    keywords: ["passport", "birth certificate", "medical", "qualification", "qualifications"],
    title: "Passport",
    documentType: "Identity document",
    suggestedRoomId: "bedroom",
    suggestedRoomName: "Bedroom",
    category: "Identity",
    provider: "HM Passport Office",
    policyNumber: "PPT-4829-UK",
    expiryDate: "2031-08-14",
    reminderDate: "2031-02-14",
    summary: "Passport identity record with an expiry date that should be reviewed six months before renewal.",
    reminders: ["Renew passport six months before expiry", "Check travel document details before booking"],
  },
  {
    keywords: ["driving licence", "driving-license", "driving_licence", "driver licence", "drivers licence"],
    title: "Driving Licence",
    documentType: "Identity document",
    suggestedRoomId: "bedroom",
    suggestedRoomName: "Bedroom",
    category: "Identity",
    provider: "DVLA",
    policyNumber: "DL-9012",
    expiryDate: "2030-04-21",
    reminderDate: "2030-01-21",
    summary: "Driving licence record with a renewal date and identity details.",
    reminders: ["Review driving licence renewal window"],
  },
  {
    keywords: ["car insurance", "vehicle insurance", "breakdown cover", "service record"],
    title: "Car Insurance Policy",
    documentType: "Insurance policy",
    suggestedRoomId: "garage",
    suggestedRoomName: "Garage",
    category: "Vehicle Insurance",
    provider: "Aviva",
    policyNumber: "CAR-77821",
    expiryDate: "2027-03-02",
    reminderDate: "2027-02-02",
    summary: "Vehicle insurance policy with annual renewal and policy number.",
    reminders: ["Compare car insurance before renewal", "Check named drivers and cover level"],
  },
  {
    keywords: ["mot"],
    title: "MOT Certificate",
    documentType: "Vehicle certificate",
    suggestedRoomId: "garage",
    suggestedRoomName: "Garage",
    category: "MOT",
    provider: "DVSA",
    policyNumber: "MOT-24019",
    expiryDate: "2026-11-18",
    reminderDate: "2026-10-18",
    summary: "MOT certificate with test expiry and vehicle compliance details.",
    reminders: ["Book MOT before expiry"],
  },
  {
    keywords: ["vehicle tax", "road tax"],
    title: "Vehicle Tax",
    documentType: "Vehicle tax",
    suggestedRoomId: "garage",
    suggestedRoomName: "Garage",
    category: "Vehicle Tax",
    provider: "DVLA",
    policyNumber: "TAX-6382",
    expiryDate: "2027-01-31",
    reminderDate: "2027-01-01",
    summary: "Vehicle tax record with renewal timing.",
    reminders: ["Renew vehicle tax"],
  },
  {
    keywords: [
      "home insurance",
      "house insurance",
      "buildings insurance",
      "utilities",
      "warranty",
      "warranties",
      "property documents",
    ],
    title: "Home Insurance Policy",
    documentType: "Insurance policy",
    suggestedRoomId: "family-room",
    suggestedRoomName: "Family Room",
    category: "Home Insurance",
    provider: "Direct Line",
    policyNumber: "HOME-19384",
    expiryDate: "2027-05-19",
    reminderDate: "2027-04-19",
    summary: "Home insurance policy covering household and property protection.",
    reminders: ["Review home insurance cover before renewal"],
  },
  {
    keywords: ["boiler"],
    title: "Boiler Service Record",
    documentType: "Maintenance document",
    suggestedRoomId: "family-room",
    suggestedRoomName: "Family Room",
    category: "Home Maintenance",
    provider: "British Gas",
    policyNumber: "BOL-39211",
    expiryDate: "2027-02-10",
    reminderDate: "2027-01-10",
    summary: "Boiler service or cover document with annual maintenance timing.",
    reminders: ["Book annual boiler service"],
  },
  {
    keywords: ["mortgage", "bank", "finance", "contract", "investments"],
    title: "Mortgage Statement",
    documentType: "Finance document",
    suggestedRoomId: "office",
    suggestedRoomName: "Office",
    category: "Mortgage",
    provider: "Nationwide",
    policyNumber: "MTG-84021",
    expiryDate: "2028-09-30",
    reminderDate: "2028-03-30",
    summary: "Mortgage document with account and review details.",
    reminders: ["Review mortgage rate six months before deal ends"],
  },
  {
    keywords: ["pension"],
    title: "Pension Statement",
    documentType: "Finance document",
    suggestedRoomId: "office",
    suggestedRoomName: "Office",
    category: "Pension",
    provider: "Scottish Widows",
    policyNumber: "PEN-50833",
    expiryDate: "2027-12-31",
    reminderDate: "2027-11-30",
    summary: "Pension statement with provider and annual review information.",
    reminders: ["Review pension contribution and beneficiaries"],
  },
  {
    keywords: ["will", "power of attorney", "poa", "funeral wishes"],
    title: "Will",
    documentType: "Legal document",
    suggestedRoomId: "safe-room",
    suggestedRoomName: "Safe Room",
    category: "Legal & Legacy",
    provider: "Family Solicitor",
    policyNumber: "WILL-2026",
    expiryDate: "2029-06-09",
    reminderDate: "2029-03-09",
    summary: "Legal legacy document that should be reviewed after life changes or every few years.",
    reminders: ["Review will and beneficiaries"],
  },
  {
    keywords: ["life insurance", "life cover"],
    title: "Life Insurance Policy",
    documentType: "Insurance policy",
    suggestedRoomId: "safe-room",
    suggestedRoomName: "Safe Room",
    category: "Emergency & Legacy",
    provider: "Legal & General",
    policyNumber: "LIFE-72451",
    expiryDate: "2036-06-09",
    reminderDate: "2027-06-09",
    summary: "Life insurance policy for emergency and legacy planning.",
    reminders: ["Review life insurance beneficiaries annually"],
  },
  {
    keywords: ["pet", "vet", "vets", "pet insurance", "garden equipment"],
    title: "Pet Vet Record",
    documentType: "Pet care document",
    suggestedRoomId: "garden",
    suggestedRoomName: "Garden",
    category: "Pets",
    provider: "Local Vet Practice",
    policyNumber: "PET-8821",
    expiryDate: "2027-07-12",
    reminderDate: "2027-06-12",
    summary: "Pet care record with vaccination or appointment timing.",
    reminders: ["Book pet vaccination check"],
  },
  {
    keywords: ["travel", "flight", "flights", "travel insurance", "visa", "visas", "holiday booking"],
    title: "Travel Document",
    documentType: "Travel document",
    suggestedRoomId: "driveway",
    suggestedRoomName: "Driveway",
    category: "Travel",
    provider: "Travel provider",
    policyNumber: "TRV-1408",
    expiryDate: "2026-09-16",
    reminderDate: "2026-08-16",
    summary: "Travel booking or journey document with date-sensitive actions.",
    reminders: ["Check travel documents before departure"],
  },
];

export function analyseDocument(fileName: string): DocumentAnalysis {
  const normalized = fileName.toLowerCase().replace(/[_-]+/g, " ");
  const matched =
    templates.find((template) =>
      template.keywords.some((keyword) => normalized.includes(keyword)),
    ) ?? fallbackTemplate(fileName);

  return {
    title: matched.title,
    documentType: matched.documentType,
    suggestedRoomId: matched.suggestedRoomId,
    suggestedRoomName: matched.suggestedRoomName,
    category: matched.category,
    provider: matched.provider,
    policyNumber: matched.policyNumber,
    issueDate: "2026-06-09",
    expiryDate: matched.expiryDate,
    reminderDate: matched.reminderDate,
    confidence: matched.suggestedRoomId === "vault" ? 0.54 : 0.88,
    extractedSummary: matched.summary,
    suggestedReminders: matched.reminders.map((title) => ({
      title,
      dueDate: matched.reminderDate,
      priority: matched.suggestedRoomId === "vault" ? "low" : ("high" as const),
    })),
  };
}

function fallbackTemplate(fileName: string): AnalysisTemplate {
  return {
    keywords: [],
    title: tidyFileName(fileName),
    documentType: "Unsorted document",
    suggestedRoomId: "vault",
    suggestedRoomName: "Vault",
    category: "Unsorted",
    provider: "Unknown provider",
    policyNumber: "Not detected",
    expiryDate: "",
    reminderDate: "",
    summary: "The mock analyser could not confidently classify this file. Save it to the vault and sort it later.",
    reminders: [],
  };
}

function tidyFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
