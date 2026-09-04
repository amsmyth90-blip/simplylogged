const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_PROPOSAL_DECISION_BYTES = 2 * 1024;

export type ProposalDecision = {
  decision: "approve" | "dismiss";
  proposalId: string;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Proposal decision must be an object.");
  }
  return value as Record<string, unknown>;
}

export function parseProposalDecision(value: unknown): ProposalDecision {
  const input = object(value);
  const keys = Object.keys(input);
  if (keys.length !== 2 || !keys.includes("decision") || !keys.includes("proposalId")) {
    throw new Error("Proposal decision fields are invalid.");
  }
  if (!uuidPattern.test(String(input.proposalId ?? ""))) {
    throw new Error("Proposal identifier is invalid.");
  }
  if (input.decision !== "approve" && input.decision !== "dismiss") {
    throw new Error("Proposal decision is invalid.");
  }
  return { decision: input.decision, proposalId: String(input.proposalId) };
}
