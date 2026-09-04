import type { OfficeContractMutation } from "./contract-types.ts";
import { parseSaveOfficeContract } from "./contract-parser.ts";
import { exact, optionalText, record } from "./validation.ts";

export function parseOfficeContractMutation(value: unknown): OfficeContractMutation {
  const item = record(value, "Office contract update");
  exact(item, ["operation", "revision", "contractId", "contract"], "Office contract update");
  if (item.operation !== "SAVE_CONTRACT") throw new Error("Office contract operation is invalid.");
  return {
    operation: "SAVE_CONTRACT",
    revision: optionalText(item.revision, "Office revision", 40),
    contractId: optionalText(item.contractId, "Contract ID", 128),
    contract: parseSaveOfficeContract(item.contract),
  };
}
