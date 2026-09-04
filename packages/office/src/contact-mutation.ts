import type { OfficeContactsMutation } from "./contact-types.ts";
import { parseSaveOfficeContact } from "./contact-parser.ts";
import { exact, list, optionalText, record, text } from "./validation.ts";

export function parseOfficeContactsMutation(value: unknown): OfficeContactsMutation {
  const mutation = record(value, "Office contacts update");
  if (mutation.operation === "SAVE_CONTACT") {
    exact(mutation, ["operation", "revision", "contactId", "contact"],
      "Office contacts update");
    return {
      operation: "SAVE_CONTACT",
      revision: optionalText(mutation.revision, "Office revision", 40),
      contactId: optionalText(mutation.contactId, "Contact ID", 128),
      contact: parseSaveOfficeContact(mutation.contact),
    };
  }
  if (mutation.operation === "DELETE_CONTACT") {
    exact(mutation, ["operation", "revision", "contactId"], "Office contacts update");
    return {
      operation: "DELETE_CONTACT",
      revision: optionalText(mutation.revision, "Office revision", 40),
      contactId: text(mutation.contactId, "Contact ID", 128),
    };
  }
  if (mutation.operation === "IMPORT_CONTACTS") {
    exact(mutation, ["operation", "revision", "contacts"], "Office contacts update");
    const contacts = list(mutation.contacts, "Imported contacts", 100).map(parseSaveOfficeContact);
    if (!contacts.length) throw new Error("Add at least one contact to import.");
    return {
      operation: "IMPORT_CONTACTS",
      revision: optionalText(mutation.revision, "Office revision", 40),
      contacts,
    };
  }
  throw new Error("Office contacts operation is invalid.");
}
