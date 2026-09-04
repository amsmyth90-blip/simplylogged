import { parseSaveOfficeContact } from "./contact-parser.ts";
import { officeContactCategories, type SaveOfficeContact } from "./contact-types.ts";

function rows(text: string) {
  const output: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) output.push(row);
      row = [];
      cell = "";
      if (output.length > 101) throw new Error("Import no more than 100 contacts at once.");
    } else {
      cell += character;
      if (cell.length > 4_000) throw new Error("A CSV field is too long.");
    }
    if (row.length > 32) throw new Error("The CSV file has too many columns.");
  }
  if (quoted) throw new Error("The CSV file has an unfinished quoted field.");
  row.push(cell.trim());
  if (row.some(Boolean)) output.push(row);
  if (output.length > 101) throw new Error("Import no more than 100 contacts at once.");
  return output;
}

function header(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function category(value: string): SaveOfficeContact["category"] {
  return officeContactCategories.find(
    (item) => item.toLowerCase() === value.trim().toLowerCase(),
  ) ?? "Other";
}

function value(record: Record<string, string>, ...keys: string[]) {
  return keys.map((key) => record[key]).find(Boolean) ?? "";
}

export function parseOfficeContactCsv(text: string) {
  if (text.length > 256 * 1024) throw new Error("The CSV file is too large.");
  const parsed = rows(text.replace(/^\uFEFF/, ""));
  if (parsed.length < 2) throw new Error("The CSV file needs headings and at least one contact.");
  const headings = parsed[0]!.map(header);
  const candidates = parsed.slice(1).map((cells) => {
    const record = Object.fromEntries(
      headings.map((heading, index) => [heading, cells[index] ?? ""]),
    );
    const combinedName = value(record, "name").trim();
    const parts = combinedName.split(/\s+/).filter(Boolean);
    return {
      firstName: value(record, "firstname", "givenname") || parts[0] || "",
      lastName: value(record, "lastname", "surname") || parts.slice(1).join(" "),
      role: value(record, "role", "jobtitle"),
      company: value(record, "company", "organisation", "organization"),
      category: category(value(record, "category")),
      phone: value(record, "phone", "telephone", "mobile"),
      email: value(record, "email"),
      address: value(record, "address"),
      notes: value(record, "notes"),
      isFavourite: false,
      isEmergencyContact: false,
      nextReviewDate: "",
      linkedDocumentIds: [],
      linkedPolicyIds: [],
      linkedContractIds: [],
      linkedBillIds: [],
      contactNotes: [],
      meetings: [],
    } satisfies SaveOfficeContact;
  });
  const useful = candidates.filter((contact) =>
    contact.firstName || contact.lastName || contact.company);
  if (!useful.length) throw new Error("No contacts could be read from this CSV file.");
  return useful.map(parseSaveOfficeContact);
}
