import {
  professionalContactCategories,
  type ProfessionalContact,
  type ProfessionalContactCategory,
} from "@/lib/professional-contact-records";

export type CsvContactPreview = Omit<
  ProfessionalContact,
  "id" | "createdAt" | "updatedAt"
>;

function normaliseHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function categoryFromCsv(value: string): ProfessionalContactCategory {
  return (
    professionalContactCategories.find(
      (category) => category.toLowerCase() === value.trim().toLowerCase(),
    ) ?? "Other"
  );
}

export function parseContactCsv(text: string): CsvContactPreview[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2)
    throw new Error(
      "The CSV file needs a header row and at least one contact.",
    );
  const headers = parseCsvLine(lines[0]).map(normaliseHeader);
  const rows = lines
    .slice(1, 101)
    .map((line) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ) as Record<string, string>;
      const combinedName = row.name?.trim() ?? "";
      const parts = combinedName.split(/\s+/);
      return {
        firstName:
          row.firstname || row.givenname || (combinedName ? parts[0] : ""),
        lastName:
          row.lastname ||
          row.surname ||
          (combinedName ? parts.slice(1).join(" ") : ""),
        role: row.role || row.jobtitle || "",
        company: row.company || row.organisation || row.organization || "",
        category: categoryFromCsv(row.category || ""),
        phone: row.phone || row.telephone || row.mobile || "",
        email: row.email || "",
        address: row.address || "",
        notes: row.notes || "",
        isFavourite: false,
        isEmergencyContact: false,
        nextReviewDate: "",
        linkedDocumentIds: [],
        linkedPolicyIds: [],
        linkedContractIds: [],
        linkedBillIds: [],
        contactNotes: [],
        meetings: [],
      };
    })
    .filter(
      (contact) => contact.firstName || contact.lastName || contact.company,
    );
  if (!rows.length)
    throw new Error("No contacts could be read from this CSV file.");
  return rows;
}
