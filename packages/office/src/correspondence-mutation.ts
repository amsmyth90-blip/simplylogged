import type { OfficeCorrespondenceMutation } from "./correspondence-types.ts";
import { parseSaveOfficeCorrespondence } from "./correspondence-parser.ts";
import { exact, optionalText, record } from "./validation.ts";

export function parseOfficeCorrespondenceMutation(value: unknown): OfficeCorrespondenceMutation {
  const mutation = record(value, "Office correspondence update");
  exact(mutation, ["operation", "revision", "correspondenceId", "correspondence"],
    "Office correspondence update");
  if (mutation.operation !== "SAVE_CORRESPONDENCE") {
    throw new Error("Office correspondence operation is invalid.");
  }
  return {
    operation: "SAVE_CORRESPONDENCE",
    revision: optionalText(mutation.revision, "Office revision", 40),
    correspondenceId: optionalText(mutation.correspondenceId, "Correspondence ID", 128),
    correspondence: parseSaveOfficeCorrespondence(mutation.correspondence),
  };
}
