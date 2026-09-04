import type { OfficeBillMutation } from "./types.ts";
import { exact, optionalText, record } from "./validation.ts";
import { parseSaveOfficeBill } from "./parser.ts";

export function parseOfficeBillMutation(value: unknown): OfficeBillMutation {
  const mutation = record(value, "Office bill update");
  exact(mutation, ["operation", "revision", "billId", "bill"], "Office bill update");
  if (mutation.operation !== "SAVE_BILL") throw new Error("Office bill operation is invalid.");
  return {
    operation: "SAVE_BILL",
    revision: optionalText(mutation.revision, "Office revision", 40),
    billId: optionalText(mutation.billId, "Bill ID", 128),
    bill: parseSaveOfficeBill(mutation.bill),
  };
}
