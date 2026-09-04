import type { OfficeInsuranceMutation } from "./insurance-types.ts";
import { parseSaveOfficeClaim, parseSaveOfficePolicy } from "./insurance-parser.ts";
import { exact, optionalText, record } from "./validation.ts";

export function parseOfficeInsuranceMutation(value: unknown): OfficeInsuranceMutation {
  const item = record(value, "Office insurance update");
  if (item.operation === "SAVE_POLICY") {
    exact(item, ["operation", "revision", "policyId", "policy"], "Office policy update");
    return {
      operation: "SAVE_POLICY",
      revision: optionalText(item.revision, "Office revision", 40),
      policyId: optionalText(item.policyId, "Policy ID", 128),
      policy: parseSaveOfficePolicy(item.policy),
    };
  }
  if (item.operation === "SAVE_CLAIM") {
    exact(item, ["operation", "revision", "claimId", "claim"], "Office claim update");
    return {
      operation: "SAVE_CLAIM",
      revision: optionalText(item.revision, "Office revision", 40),
      claimId: optionalText(item.claimId, "Claim ID", 128),
      claim: parseSaveOfficeClaim(item.claim),
    };
  }
  throw new Error("Office insurance operation is invalid.");
}
