export type FilingSuggestionInput = {
  title?: string | null;
  category?: string | null;
  issuer?: string | null;
  originalFileName?: string | null;
  extractionSummary?: string | null;
  extractedText?: string | null;
  roomId?: string | null;
  roomName?: string | null;
};

export type FilingSuggestion = {
  roomId: string;
  roomName: string;
  category: string;
  reason: string;
  confidence: "high" | "medium" | "low";
};

const fallbackSuggestion: FilingSuggestion = {
  roomId: "office",
  roomName: "Office",
  category: "Important Correspondence",
  reason: "This looks like general life admin, so Office is the safest review place.",
  confidence: "low"
};

function searchableText(input: FilingSuggestionInput) {
  return [
    input.title,
    input.category,
    input.issuer,
    input.originalFileName,
    input.extractionSummary,
    input.extractedText,
    input.roomName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function suggestFilingDestination(input: FilingSuggestionInput): FilingSuggestion {
  const text = searchableText(input);

  if (input.roomId && input.roomName && input.roomId !== "mailbox") {
    return {
      roomId: input.roomId,
      roomName: input.roomName,
      category: input.category || fallbackSuggestion.category,
      reason: `It is already linked to ${input.roomName}.`,
      confidence: "high"
    };
  }

  if (hasAny(text, ["passport", "driving licence", "driver licence", "birth certificate", "marriage certificate", "id card"])) {
    return {
      roomId: "office",
      roomName: "Office",
      category: "Identity",
      reason: "This looks like a personal ID or certificate document.",
      confidence: "high"
    };
  }

  if (hasAny(text, ["will", "executor", "letter of wishes", "funeral", "power of attorney", "probate"])) {
    return {
      roomId: "office",
      roomName: "Office",
      category: "Legal & Estate",
      reason: "This looks like estate planning or legal preparation.",
      confidence: "high"
    };
  }

  if (hasAny(text, ["invoice", "bill", "statement", "payment due", "direct debit", "hmrc", "council tax", "electric", "gas", "broadband", "water"])) {
    return {
      roomId: "office",
      roomName: "Office",
      category: "Finance",
      reason: "This looks like a bill, statement or important financial letter.",
      confidence: "high"
    };
  }

  if (hasAny(text, ["mot", "vehicle", "car insurance", "road tax", "service history", "mileage", "v5c", "logbook", "tyre", "breakdown cover"])) {
    return {
      roomId: "garage",
      roomName: "Vehicles",
      category: "Vehicle",
      reason: "This looks connected to a vehicle, MOT, tax, insurance or servicing.",
      confidence: "high"
    };
  }

  if (hasAny(text, ["nhs", "prescription", "medical", "clinic", "hospital", "appointment", "blood test", "allergy", "medication"])) {
    return {
      roomId: "bedroom",
      roomName: "Health",
      category: "Health & Medical",
      reason: "This looks like a health, appointment or medicine record.",
      confidence: "high"
    };
  }

  if (hasAny(text, ["recipe", "meal", "ingredients", "nutrition", "pantry", "shopping list"])) {
    return {
      roomId: "kitchen",
      roomName: "Kitchen",
      category: "Recipes",
      reason: "This looks related to recipes, meals or kitchen planning.",
      confidence: "medium"
    };
  }

  if (hasAny(text, ["vet", "pet", "dog", "cat", "vaccination", "microchip", "flea", "worming"])) {
    return {
      roomId: "garden",
      roomName: "Pets",
      category: "Pets",
      reason: "This looks like a pet or outdoor-life record.",
      confidence: "high"
    };
  }

  if (hasAny(text, ["flight", "boarding pass", "hotel", "booking", "travel insurance", "itinerary", "holiday", "trip"])) {
    return {
      roomId: "driveway",
      roomName: "Travel",
      category: "Travel",
      reason: "This looks like travel planning or trip paperwork.",
      confidence: "high"
    };
  }

  if (hasAny(text, ["photo", "memory", "story", "keepsake", "heirloom", "family history"])) {
    return {
      roomId: "attic",
      roomName: "Memories",
      category: "Memories",
      reason: "This looks like a memory, keepsake or family story item.",
      confidence: "medium"
    };
  }

  return fallbackSuggestion;
}
