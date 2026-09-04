export const documentCategoryOptions = [
  "Identity",
  "Home & Property",
  "Finance",
  "Legal & Estate",
  "Health & Medical",
  "Memories"
] as const;

export const suggestedRoomOptions = [
  "Attic",
  "Office",
  "Garage",
  "Bedroom",
  "Family Room",
  "Kitchen",
  "Garden",
  "Driveway",
  "Safe Room",
  "Mailbox"
] as const;

export type DocumentCategory = (typeof documentCategoryOptions)[number];
export type SuggestedRoom = (typeof suggestedRoomOptions)[number];

export type DocumentExtractedField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source: "uploaded_document";
  userConfirmed: false;
};

export type DocumentExtractionResult = {
  title: string;
  issuer: string;
  category: DocumentCategory;
  suggestedRoom: SuggestedRoom;
  summary: string;
  reminderTitle: string;
  reminderTimeLabel: string;
  detectedDocumentType: string;
  dueDate: string;
  actionItems: string[];
  extractedText: string;
  confidence: number;
  extractedFields?: DocumentExtractedField[];
};

export const documentExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    issuer: { type: "string" },
    category: {
      type: "string",
      enum: [...documentCategoryOptions]
    },
    suggestedRoom: {
      type: "string",
      enum: [...suggestedRoomOptions]
    },
    summary: { type: "string" },
    reminderTitle: { type: "string" },
    reminderTimeLabel: { type: "string" },
    detectedDocumentType: { type: "string" },
    dueDate: { type: "string" },
    actionItems: {
      type: "array",
      items: { type: "string" }
    },
    extractedText: { type: "string" },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    extractedFields: {
      type: "array",
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          value: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          source: { type: "string", enum: ["uploaded_document"] },
          userConfirmed: { type: "boolean", enum: [false] }
        },
        required: ["key", "label", "value", "confidence", "source", "userConfirmed"]
      }
    }
  },
  required: [
    "title",
    "issuer",
    "category",
    "suggestedRoom",
    "summary",
    "reminderTitle",
    "reminderTimeLabel",
    "detectedDocumentType",
    "dueDate",
    "actionItems",
    "extractedText",
    "confidence",
    "extractedFields"
  ]
} as const;
